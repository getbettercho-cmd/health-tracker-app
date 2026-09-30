import { NextRequest, NextResponse } from "next/server";

const NOTION_DB_ID = "d4506bcb-0763-4997-8b6e-4c57344eeef6";
const FOODS_KEY = "FOODS_LIST"; // 음식 목록을 저장하는 노션 페이지 제목 (기록 히스토리에서는 제외됨)
const CHUNK = 1900; // 노션 rich_text 한 덩어리 최대 2000자

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
});

async function findPage(token: string) {
  const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ filter: { property: "날짜", title: { equals: FOODS_KEY } } }),
  });
  const data = await res.json();
  return data.results?.[0] || null;
}

type Food = { id: string; name: string; kcal: number; protein: number; fav: boolean };

type RawFood = { id?: unknown; name?: unknown; kcal?: unknown; protein?: unknown; fav?: unknown };
type RichText = { text?: { content?: string } };

function sanitize(input: unknown): Food[] {
  if (!Array.isArray(input)) return [];
  return (input as RawFood[]).slice(0, 500).map((f) => ({
    id: String(f?.id || "").slice(0, 40),
    name: String(f?.name || "").slice(0, 100),
    kcal: Number.isFinite(Number(f?.kcal)) ? Math.max(0, Number(f?.kcal)) : 0,
    protein: Number.isFinite(Number(f?.protein)) ? Math.max(0, Number(f?.protein)) : 0,
    fav: !!f?.fav,
  })).filter((f) => f.id && f.name);
}

export async function GET() {
  const token = process.env.NOTION_TOKEN;
  if (!token) return NextResponse.json({ success: false, error: "No Notion token" });
  try {
    const page = await findPage(token);
    if (!page) return NextResponse.json({ success: true, found: false, foods: [] });
    const json = (page.properties?.["메모"]?.rich_text || []).map((t: RichText) => t.text?.content || "").join("");
    let foods: Food[] = [];
    try { foods = sanitize(JSON.parse(json || "[]")); } catch { foods = []; }
    return NextResponse.json({ success: true, found: true, foods });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) });
  }
}

export async function POST(req: NextRequest) {
  const token = process.env.NOTION_TOKEN;
  if (!token) return NextResponse.json({ success: false, error: "No Notion token" });
  try {
    const { foods } = await req.json();
    const json = JSON.stringify(sanitize(foods));
    const chunks: string[] = [];
    for (let i = 0; i < json.length; i += CHUNK) chunks.push(json.slice(i, i + CHUNK));
    const properties = {
      "날짜": { title: [{ text: { content: FOODS_KEY } }] },
      "메모": { rich_text: chunks.map((c) => ({ text: { content: c } })) },
    };
    const existing = await findPage(token);
    const res = existing
      ? await fetch(`https://api.notion.com/v1/pages/${existing.id}`, { method: "PATCH", headers: headers(token), body: JSON.stringify({ properties }) })
      : await fetch("https://api.notion.com/v1/pages", { method: "POST", headers: headers(token), body: JSON.stringify({ parent: { database_id: NOTION_DB_ID }, properties }) });
    const data = await res.json();
    if (data.id) return NextResponse.json({ success: true });
    return NextResponse.json({ success: false, error: JSON.stringify(data).slice(0, 300) });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) });
  }
}
