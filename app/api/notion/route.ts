import { NextRequest, NextResponse } from "next/server";

const NOTION_DS_ID = "0d76a3f3-f2c8-45a8-a006-bcf64a590ae2";

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

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
      system: `You are a Notion integration assistant. Use MCP tools to manage health records in Notion data source "${NOTION_DS_ID}". Respond with JSON only: {"success": true, "page_url": "..."} or {"success": false, "error": "..."}`,
      messages: [{ role: "user", content: prompt }],
      mcp_servers: [{ type: "url", url: "https://mcp.notion.com/mcp", name: "notion-mcp" }],
    }),
  });

  const data = await res.json();
  const text = (data.content || []).map((i: any) => i.text || "").join("");
  try {
    return NextResponse.json(JSON.parse(text.replace(/```json|```/g, "").trim()));
  } catch {
    return NextResponse.json({ success: text.includes("success") || text.includes("created") || text.includes("updated") });
  }
}
