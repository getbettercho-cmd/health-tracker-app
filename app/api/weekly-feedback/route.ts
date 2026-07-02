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
    await fetch(`https://api.notion.com/v1/pages/${existing.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });
  } else {
    await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ parent: { database_id: NOTION_DB_ID }, properties }),
    });
  }
}

async function generateFeedback(days: any[], weekStart: string, weekEnd: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY가 설정되어 있지 않아요");

  const dayLines = days
    .map((d) => {
      if (!d || !d.hasRecord) return `- ${d?.dateLabel || ""}: 기록 없음`;
      return `- ${d.dateLabel}: 단백질 ${d.protein || 0}g, 걸음수 ${d["걸음수"] || 0}보, 물 ${d["수분"] || 0}L, 수면 ${d["수면"] || "-"}, 컨디션 ${d["컨디션"] || "-"}, 운동 ${d["운동"] || "-"}, 몸무게 ${d["몸무게"] || "-"}, 메모 ${d["메모"] || "-"}`;
    })
    .join("\n");

  const prompt = `너는 사용자의 개인 건강 트레이너야. 아래는 ${weekStart} ~ ${weekEnd} (토~금) 한 주간의 건강 기록이야.

[사용자 목표]
- 하루 1만보 (13,000보 넘지 않기)
- 단백질 하루 74~99g
- 고강도 운동 금지, 수면 규칙적으로, 물 1.5~2L 이상, 음주 최소화

[이번 주 기록]
${dayLines}

이 기록을 바탕으로 피드백을 줘. 반드시 아래 JSON 형식으로만 답해 (다른 텍스트나 설명 없이 JSON만):
{"good": ["잘한 점 1~3개"], "improve": ["보완하면 좋을 점 1~3개"], "urgent": ["당장 수정해야 할 점, 없으면 빈 배열"]}
각 항목은 한국어로 한 문장씩, 구체적이고 실용적으로 작성해.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();

  if (!res.ok || data?.type === "error") {
    const msg = data?.error?.message || `Claude API 호출 실패 (status ${res.status})`;
    throw new Error(msg);
  }

  const text = data.content?.[0]?.text || "";
  if (!text) throw new Error("Claude 응답이 비어 있어요");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude 응답에서 JSON을 찾지 못했어요: " + text.slice(0, 200));

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Claude 응답 JSON 파싱 실패: " + jsonMatch[0].slice(0, 200));
  }

  return {
    good: parsed.good || [],
    improve: parsed.improve || [],
    urgent: parsed.urgent || [],
  };
}

export async function POST(req: NextRequest) {
  const { weekStart, weekEnd, days, force } = await req.json();
  const token = process.env.NOTION_TOKEN;
  if (!token) return NextResponse.json({ success: false, error: "No Notion token" });

  try {
    const key = weekCacheKey(weekStart);
    const existing = await findExistingPage(token, key);

    if (!force && existing) {
      const raw = existing.properties?.["메모"]?.rich_text?.[0]?.text?.content;
      if (raw) {
        try {
          const cached = JSON.parse(raw);
          return NextResponse.json({ success: true, fromCache: true, feedback: cached });
        } catch {
          // 캐시 파싱 실패 시 새로 생성
        }
      }
    }

    const feedback = await generateFeedback(days, weekStart, weekEnd);
    await saveFeedback(token, weekStart, existing, feedback);
    return NextResponse.json({ success: true, fromCache: false, feedback });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e?.message || e) });
  }
}
