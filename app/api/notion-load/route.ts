import { NextResponse } from "next/server";

const NOTION_DS_ID = "0d76a3f3-f2c8-45a8-a006-bcf64a590ae2";

export async function GET() {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: `You are a Notion assistant. Use notion-search to find all pages in data source "collection://${NOTION_DS_ID}".

Return ONLY a JSON array like this (no markdown, no explanation):
[{"날짜":"6월 23일 (화)","단백질":71,"걸음수":9000,"수분":1.5,"몸무게":null,"컨디션":"좋음 🙂","수면":"23:00 ~ 07:00","운동":"산책","식사메모":"[점심] 닭가슴살","메모":""}]

If no pages found, return [].`,
      messages: [{ role: "user", content: "Fetch all pages from the 건강관리 기록 Notion database and return as JSON array." }],
      mcp_servers: [{ type: "url", url: "https://mcp.notion.com/mcp", name: "notion-mcp" }],
    }),
  });

  const data = await res.json();
  const text = (data.content || []).map((i: any) => i.text || "").join("");
  const clean = text.replace(/```json|```/g, "").trim();
  const jsonStart = clean.indexOf("[");
  const jsonEnd = clean.lastIndexOf("]");
  if (jsonStart === -1) return NextResponse.json([]);
  try {
    return NextResponse.json(JSON.parse(clean.slice(jsonStart, jsonEnd + 1)));
  } catch {
    return NextResponse.json([]);
  }
}
