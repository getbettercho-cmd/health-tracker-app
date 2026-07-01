import { NextResponse } from "next/server";

const NOTION_DB_ID = "d4506bcb-0763-4997-8b6e-4c57344eeef6";

export async function GET() {
  const token = process.env.NOTION_TOKEN;
  if (!token) return NextResponse.json([]);

  const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      page_size: 100,
      filter: { property: "날짜", title: { does_not_contain: "WEEK_" } },
      sorts: [{ property: "날짜", direction: "descending" }],
    }),
  });

  const data = await res.json();
  if (!data.results) return NextResponse.json([]);

  const records = data.results.map((page: any) => {
    const p = page.properties;
    return {
      "날짜": p["날짜"]?.title?.[0]?.text?.content || "",
      "단백질": p["단백질"]?.number || 0,
      "걸음수": p["걸음수"]?.number || 0,
      "수분": p["수분"]?.number || 0,
      "수면": p["수면"]?.rich_text?.[0]?.text?.content || "",
      "컨디션": p["컨디션"]?.rich_text?.[0]?.text?.content || "",
      "운동": p["운동"]?.rich_text?.[0]?.text?.content || "",
      "메모": p["메모"]?.rich_text?.[0]?.text?.content || "",
      "식사메모": p["식사메모"]?.rich_text?.[0]?.text?.content || "",
      "몸�