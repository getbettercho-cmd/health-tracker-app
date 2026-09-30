import { NextRequest, NextResponse } from "next/server";

const NOTION_DB_ID = "d4506bcb-0763-4997-8b6e-4c57344eeef6";

const headers = (token: string) => ({
  "Authorization": `Bearer ${token}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
});

async function findDraft(token: string, title: string) {
  const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ filter: { property: "날짜", title: { equals: title } } }),
  });
  const data = await res.json();
  return data.results?.[0];
}

const text = (p: any) => (p?.rich_text || []).map((t: any) => t.text?.content || "").join("");

// 임시저장된 기록 불러오기: GET /api/notion-draft?date=9월 30일 (수) (임시)
export async function GET(req: NextRequest) {
  const token = process.env.NOTION_TOKEN;
  const title = req.nextUrl.searchParams.get("date");
  if (!token || !title) return NextResponse.json({ success: false, found: false });

  const page = await findDraft(token, title);
  if (!page) return NextResponse.json({ success: true, found: false });

  const p = page.properties;
  return NextResponse.json({
    success: true,
    found: true,
    savedAt: page.last_edited_time,
    draft: {
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
}

// 최종저장 후 임시저장 정리(보관 처리): DELETE /api/notion-draft?date=...
export async function DELETE(req: NextRequest) {
  const token = process.env.NOTION_TOKEN;
  const title = req.nextUrl.searchParams.get("date");
  if (!token || !title) return NextResponse.json({ success: false });

  const page = await findDraft(token, title);
  if (!page) return NextResponse.json({ success: true });

  const res = await fetch(`https://api.notion.com/v1/pages/${page.id}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify({ archived: true }),
  });
  const data = await res.json();
  return NextResponse.json({ success: !!data.id });
}
