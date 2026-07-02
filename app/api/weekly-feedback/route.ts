import { NextRequest, NextResponse } from "next/server";

const NOTION_DB_ID = "d4506bcb-0763-4997-8b6e-4c57344eeef6";

function weekCacheKey(weekStart: string) {
  return `WEEK_${weekStart}`;
}

async function findExistingPage(token: string, key: string) {
  const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filter: { property: "날짜", title: { equals: key } } }),
  });
  const data = await res.json();
  return data.results?.[0] || null;
}

async function saveFeedback(token: string, weekStart: string, existing: any, feedback: any) {
  const properties = {
    "날짜": { title: [{ text: { content: weekCacheKey(weekStart) } }] },
    "메모": { rich_text: [{ text: { content: JSON.stringify(feedback) } }] },
  };
  if (existing) {
    const res = await fetch(`https://api.notion.com/v1/pages/${existing.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });
    return res.json();
  } else {
    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ parent: { database_id: NOTION_DB_ID }, properties }),
    });
    return res.json();
  }
}

export async function GET(req: NextRequest) {
  const weekStart = req.nextUrl.searchParams.get("weekStart");
  const token = process.env.NOTION_TOKEN;
  if (!token) return NextResponse.json({ success: false, error: "No Notion token" });
  if (!weekStart) return NextResponse.json({ success: false, error: "weekStart 누락" });

  try {
    const existing = await findExistingPage(token, weekCacheKey(weekStart));
    const raw = existing?.properties?.["메모"]?.rich_text?.[0]?.text?.content;
    let feedback = { good: "", improve: "", urgent: "" };
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        feedback = {
          good: parsed.good || "",
          improve: parsed.improve || "",
          urgent: parsed.urgent || "",
        };
      } catch {
        // 저장된 값이 없거나 파싱 실패 시 빈 값 유지
      }
    }
    return NextResponse.json({ success: true, feedback });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e?.message || e) });
  }
}

export async function POST(req: NextRequest) {
  const { weekStart, feedback } = await req.json();
  const token = process.env.NOTION_TOKEN;
  if (!token) return NextResponse.json({ success: false, error: "No Notion token" });
  if (!weekStart) return NextResponse.json({ success: false, error: "weekStart 누락" });

  try {
    const key = weekCacheKey(weekStart);
    const existing = await findExistingPage(token, key);
    const result = await saveFeedback(token, weekStart, existing, feedback);
    if (result?.id) return NextResponse.json({ success: true });
    return NextResponse.json({ success: false, error: JSON.stringify(result).slice(0, 300) });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e?.message || e) });
  }
}
