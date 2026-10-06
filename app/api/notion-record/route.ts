import { NextRequest, NextResponse } from "next/server";

const NOTION_DB_ID = "d4506bcb-0763-4997-8b6e-4c57344eeef6";

type RichText = { text?: { content?: string } };
const text = (p: { rich_text?: RichText[] } | undefined) => (p?.rich_text || []).map((t) => t.text?.content || "").join("");

// 노션에 이미 저장된 그날의 기록 불러오기: GET /api/notion-record?date=10월 6일 (화)
export async function GET(req: NextRequest) {
  const token = process.env.NOTION_TOKEN;
  const title = req.nextUrl.searchParams.get("date");
  if (!token || !title) return NextResponse.json({ success: false, found: false });

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify({ filter: { property: "날짜", title: { equals: title } } }),
    });
    const data = await res.json();
    const page = data.results?.[0];
    if (!page) return NextResponse.json({ success: true, found: false });

    const p = page.properties;
    return NextResponse.json({
      success: true,
      found: true,
      savedAt: page.last_edited_time,
      record: {
        steps: p["걸음수"]?.number ?? null,
        water: p["수분"]?.number ?? null,
        sleep: text(p["수면"]),
        condition: p["컨디션"]?.select?.name || "",
        exercise: text(p["운동"]),
        memo: text(p["메모"]),
        mealMemo: text(p["식사메모"]),
        weight: p["몸무게"]?.number ?? null,
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, found: false, error: e instanceof Error ? e.message : String(e) });
  }
}
