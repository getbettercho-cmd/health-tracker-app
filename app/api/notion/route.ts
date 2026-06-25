import { NextRequest, NextResponse } from "next/server";

const NOTION_DB_ID = "d4506bcb-0763-4997-8b6e-4c57344eeef6";

export async function POST(req: NextRequest) {
  const { date, protein, steps, water, sleep, condition, exercise, memo, weight, mealMemo } = await req.json();

  const token = process.env.NOTION_TOKEN;
  if (!token) return NextResponse.json({ success: false, error: "No token" });

  const searchRes = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filter: { property: "날짜", title: { equals: date } }
    }),
  });

  const searchData = await searchRes.json();
  console.log("Search result:", JSON.stringify(searchData).slice(0, 200));
  const existing = searchData.results?.[0];

  const properties: any = {
    "날짜": { title: [{ text: { content: date } }] },
    "단백질": { number: protein || 0 },
    "걸음수": { number: steps ? Number(steps) : 0 },
    "수분": { number: water ? Number(water) : 0 },
    "수면": { rich_text: [{ text: { content: sleep || "" } }] },
    "운동": { rich_text: [{ text: { content: exercise || "" } }] },
    "메모": { rich_text: [{ text: { content: memo || "" } }] },
    "식사메모": { rich_text: [{ text: { content: mealMemo || "" } }] },
  };

  if (condition) properties["컨디션"] = { select: { name: condition } };
  if (weight) properties["몸무게"] = { number: Number(weight) };

  let res;
  if (existing) {
    res = await fetch(`https://api.notion.com/v1/pages/${existing.id}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });
  } else {
    res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DB_ID },
        properties,
      }),
    });
  }

  const data = await res.json();
  console.log("Notion page response:", JSON.stringify(data).slice(0, 300));
  if (data.id) return NextResponse.json({ success: true, page_url: data.url });
  return NextResponse.json({ success: false, error: JSON.stringify(data) });
}
