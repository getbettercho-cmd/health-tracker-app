"use client";
import { useState, useEffect } from "react";

const NOTION_DS_ID = "0d76a3f3-f2c8-45a8-a006-bcf64a590ae2";
const NOTION_DB_ID = "d4506bcb-0763-4997-8b6e-4c57344eeef6";
const NOTION_URL = `https://notion.so/${NOTION_DB_ID.replace(/-/g, "")}`;

// 디자인 토큰 — 블랙 + 네온라임, 라운디드, 포인트 그라데이션
const C = {
  bg: "#0a0a0c",
  card: "#17171b",
  cardAlt: "#1f1f24",
  border: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(255,255,255,0.05)",
  text: "#f2f2f0",
  textDim: "#a4a4ab",
  textMuted: "#6c6c74",
  lime: "#D7FF3E",
  limeDim: "rgba(215,255,62,0.14)",
  mint: "#7CFFB2",
  gradient: "linear-gradient(135deg, #D7FF3E 0%, #7CFFB2 100%)",
  red: "#FF6B6B",
  redDim: "rgba(255,107,107,0.14)",
  orange: "#FFB84D",
  orangeDim: "rgba(255,184,77,0.14)",
};

function estimateProtein(text) {
  if (!text) return 0;
  let total = 0;
  let meatCounted = false; // 특정 육류 규칙이 이미 단백질을 더했는지 추적 (일반 "고기" 폴백과 중복 방지용)
  const lower = text.toLowerCase();

  if (lower.includes("닭가슴살")) {
    // "닭가슴살" 뒤에 오는 숫자를 통째로 text.match 하면 문장 어딘가의 다른 음식 개수
    // (예: "닭가슴살, 계란2개"의 "2개")를 잘못 집어오는 버그가 있었음.
    // 콤마/줄바꿈으로 구분된 같은 항목(segment) 안에서만 숫자를 찾도록 제한.
    const segments = text.split(/[,\n]/);
    const seg = segments.find((s) => s.toLowerCase().includes("닭가슴살")) || "";
    const near = seg.match(/(\d+)\s*(덩어리|조각|개)?/);
    const qty = near ? parseInt(near[1]) : 1;
    const unit = near ? near[2] : null;
    // "덩어리"(또는 단위 없이 뭉텅이로 언급)는 한 덩이 기준(손바닥 크기면 150g, 아니면 200g),
    // "조각"/"개"는 소포장 제품 1개 기준(약 100g)으로 더 작게 잡음.
    const perUnit = unit === "조각" || unit === "개" ? 100 : lower.includes("손바닥") ? 150 : 200;
    // "6조각"처럼 개수가 크게 적히면 실제로는 한 덩이를 잘게 썬 것일 가능성이 높음 —
    // 한 끼에 300g(약 69g 단백질) 이상은 비현실적이라 상한을 둠.
    const grams = Math.min(qty * perUnit, 300);
    total += grams * 0.23;
    meatCounted = true;
  }
  const egg = text.match(/계란\s*(\d+)개|달걀\s*(\d+)개/);
  if (egg) total += parseInt(egg[1] || egg[2]) * 6.5;
  const sg = text.match(/삼겹살\s*(\d+)줄/);
  if (sg) { total += parseInt(sg[1]) * 50 * 0.17; meatCounted = true; }
  const al = text.match(/앞다리살\s*(\d+)근|앞다리\s*(\d+)근/);
  if (al) { total += parseInt(al[1] || al[2]) * 600 * 0.18; meatCounted = true; }
  if (lower.includes("두부")) total += lower.includes("반모") ? 150 * 0.07 : 300 * 0.07;
  if (lower.includes("생선") || lower.includes("틸라피아") || lower.includes("고등어") || lower.includes("연어") || lower.includes("참치") || lower.includes("새우") || lower.includes("오징어") || lower.includes("낙지") || lower.includes("문어")) {
    total += 100 * 0.20;
    meatCounted = true;
  }
  if (lower.includes("잠봉") || lower.includes("베이컨") || lower.includes("소시지") || lower.includes("햄")) {
    total += 30 * 0.18; // 슬라이스 몇 장 기준(샌드위치 등), 통고기보다 적게 잡음
    meatCounted = true;
  }
  if (lower.includes("그릭요거트") || lower.includes("그릭")) total += 150 * 0.10;
  if (lower.includes("모짜렐라") || lower.includes("치즈")) total += 30 * 0.22;
  if (lower.includes("쉐이크") || lower.includes("프로틴")) total += 25;
  if (lower.includes("두유")) total += 190 * 0.035;
  if (lower.includes("땅콩버터")) {
    const m = text.match(/땅콩버터\s*(\d+)g/);
    total += (m ? parseInt(m[1]) : 20) * 0.25;
  }

  // 위에서 아직 못 잡은 육류 표현(소고기/돼지고기/닭고기/삼계탕/육회/갈비/불고기 등) 처리.
  // 기존 코드는 "닭"/"삼겹"/"앞다리" 글자가 하나라도 있으면 이 블록 전체를 건너뛰어서
  // "삼계탕(닭고기만)"처럼 닭가슴살 표현이 아닌 닭고기 요리는 단백질이 0으로 잡히던 버그가 있었음.
  if (!meatCounted) {
    const genericMeatWords = ["소고기", "돼지고기", "닭고기", "삼계탕", "육회", "갈비", "불고기", "수구레", "오리", "제육", "항정살", "목살", "등심", "안심", "우삼겹", "닭갈비", "닭볶음탕"];
    if (genericMeatWords.some((w) => lower.includes(w))) {
      total += 100 * 0.20;
      meatCounted = true;
    } else if (lower.includes("고기")) {
      total += 100 * 0.18;
      meatCounted = true;
    }
  }

  return Math.round(total);
}

function toDateInput(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function fromDateInput(s) {
  return new Date(s + "T00:00:00");
}
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
function formatKR(d) {
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = DAY_NAMES[d.getDay()];
  return `${month}월 ${day}일 (${dow})`;
}
function shortDateLabel(d) {
  return `${d.getMonth() + 1}/${d.getDate()} (${DAY_NAMES[d.getDay()]})`;
}
function isWeekend(dateStr) {
  const d = fromDateInput(dateStr);
  return d.getDay() === 0 || d.getDay() === 6;
}
function addDays(dateStr, n) {
  const d = fromDateInput(dateStr);
  d.setDate(d.getDate() + n);
  return toDateInput(d);
}
function getWeekStart(dateStr) {
  const d = fromDateInput(dateStr);
  const diff = (d.getDay() + 1) % 7;
  d.setDate(d.getDate() - diff);
  return toDateInput(d);
}
function weekRangeLabel(weekStart) {
  const start = fromDateInput(weekStart);
  const end = fromDateInput(addDays(weekStart, 6));
  return `${shortDateLabel(start)} ~ ${shortDateLabel(end)}`;
}
function getMonthMeta(yearMonth) {
  const [y, m] = yearMonth.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const startDow = firstDay.getDay();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return cells;
}
function addMonths(yearMonth, n) {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(yearMonth) {
  const [y, m] = yearMonth.split("-").map(Number);
  return `${y}년 ${m}월`;
}

const EMPTY_FORM = { meals: { 아침: "", 점심: "", 간식: "", 저녁: "", 기타: "" }, steps: "", water: "", sleep: "", condition: "", exercise: "", memo: "", weight: "" };
const EMPTY_WEEKLY_NOTE = { text: "", editing: true };

const TAB_LIST = ["📝 오늘 기록", "📊 기록 히스토리"];

async function callNotion(prompt) {
  const res = await fetch("/api/notion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  return res.json();
}

export default function HealthGuide() {
  const [tab, setTab] = useState(0);
  const [selectedDate, setSelectedDate] = useState(toDateInput(new Date()));
  const [form, setForm] = useState(EMPTY_FORM);
  const [showWeight, setShowWeight] = useState(false);
  const [records, setRecords] = useState({});
  const [saveStatus, setSaveStatus] = useState("idle");
  const [draftPageUrl, setDraftPageUrl] = useState(null);
  const [pendingDraft, setPendingDraft] = useState(null); // 노션에서 찾은 임시저장본 (불러오기 전)
  const [loadStatus, setLoadStatus] = useState("loading");
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [weeklyNotes, setWeeklyNotes] = useState({}); // weekStart -> { text, status, editing }
  const [calendarMonth, setCalendarMonth] = useState(() => toDateInput(new Date()).slice(0, 7));

  useEffect(() => {
    loadFromNotion();
  }, []);

  // 선택한 날짜에 노션 임시저장본이 있는지 확인
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const title = formatKR(fromDateInput(selectedDate)) + " (임시)";
        const res = await fetch(`/api/notion-draft?date=${encodeURIComponent(title)}`);
        const result = await res.json();
        if (!cancelled && result.success && result.found) setPendingDraft(result);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [selectedDate]);

  const restoreDraft = () => {
    if (!pendingDraft) return;
    const d = pendingDraft.draft;
    const meals = { ...EMPTY_FORM.meals };
    (d.mealMemo || "").split("\n").forEach((line) => {
      const m = line.match(/^\[(아침|점심|간식|저녁|기타)\]\s?(.*)$/);
      if (m) meals[m[1]] = m[2];
    });
    setForm({
      meals,
      steps: d.steps ? String(d.steps) : "",
      water: d.water ? String(d.water) : "",
      sleep: d.sleep || "",
      condition: d.condition || "",
      exercise: d.exercise || "",
      memo: d.memo || "",
      weight: d.weight ? String(d.weight) : "",
    });
    setShowWeight(!!d.weight);
    setDraftPageUrl("saved");
    setPendingDraft(null);
  };

  const loadFromNotion = async () => {
    setLoadStatus("loading");
    try {
      const res = await fetch("/api/notion-load");
      const parsed = await res.json();
      const mapped = {};
      parsed.forEach(r => {
        const raw = r["날짜"] || "";
        const m = raw.match(/(\d+)월\s*(\d+)일/);
        if (m) {
          const year = new Date().getFullYear();
          const key = `${year}-${String(m[1]).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`;
          mapped[key] = { ...r, protein: r["단백질"] || 0 };
        }
      });
      setRecords(mapped);
      setLoadStatus("done");
    } catch {
      setLoadStatus("error");
    }
  };

  const loadWeeklyNote = async (weekStart) => {
    setWeeklyNotes(f => ({ ...f, [weekStart]: { text: "", status: "loading" } }));
    try {
      const res = await fetch(`/api/weekly-feedback?weekStart=${weekStart}`);
      const result = await res.json();
      if (result.success) {
        setWeeklyNotes(f => ({ ...f, [weekStart]: { text: result.text || "", status: "idle", editing: !result.text } }));
      } else throw new Error(result.error);
    } catch {
      setWeeklyNotes(f => ({ ...f, [weekStart]: { text: "", status: "idle", editing: true } }));
    }
  };

  const updateWeeklyNoteText = (weekStart, value) => {
    setWeeklyNotes(f => ({ ...f, [weekStart]: { ...(f[weekStart] || EMPTY_WEEKLY_NOTE), text: value } }));
  };

  const startEditingWeeklyNote = (weekStart) => {
    setWeeklyNotes(f => ({ ...f, [weekStart]: { ...(f[weekStart] || EMPTY_WEEKLY_NOTE), editing: true } }));
  };

  const saveWeeklyNote = async (weekStart) => {
    const note = weeklyNotes[weekStart] || EMPTY_WEEKLY_NOTE;
    setWeeklyNotes(f => ({ ...f, [weekStart]: { ...note, status: "saving" } }));
    try {
      const res = await fetch("/api/weekly-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, text: note.text }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      setWeeklyNotes(f => ({ ...f, [weekStart]: { ...note, status: "saved", editing: false } }));
      setTimeout(() => {
        setWeeklyNotes(f => ({ ...f, [weekStart]: { ...(f[weekStart] || note), status: "idle" } }));
      }, 1500);
    } catch {
      setWeeklyNotes(f => ({ ...f, [weekStart]: { ...note, status: "error" } }));
    }
  };

  const toggleWeek = (weekStart) => {
    if (expandedWeek === weekStart) { setExpandedWeek(null); return; }
    setExpandedWeek(weekStart);
    if (!weeklyNotes[weekStart]) loadWeeklyNote(weekStart);
  };

  const allMealText = Object.values(form.meals).join(" ");
  const estimatedProtein = estimateProtein(allMealText);
  const dateLabel = formatKR(fromDateInput(selectedDate));
  const isToday = selectedDate === toDateInput(new Date());
  const hasDraft = !!draftPageUrl;

  const setMeal = (k, v) => setForm(f => ({ ...f, meals: { ...f.meals, [k]: v } }));

  const buildPayload = (dateStr) => {
    const mealSummary = Object.entries(form.meals)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `[${k}] ${v}`)
      .join("\n");
    return {
      날짜: dateStr,
      식사메모: mealSummary || null,
      단백질: estimatedProtein || null,
      걸음수: form.steps ? parseFloat(form.steps) : null,
      수분: form.water ? parseFloat(form.water) : null,
      수면: form.sleep || null,
      컨디션: form.condition || null,
      운동: form.exercise || null,
      메모: form.memo || null,
      몸무게: form.weight ? parseFloat(form.weight) : null,
    };
  };

  const handleDraft = async () => {
    setSaveStatus("draft");
    const payload = buildPayload(dateLabel + " (임시)");
    try {
      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, date: payload.날짜, protein: payload.단백질, steps: payload.걸음수, water: payload.수분, sleep: payload.수면, condition: payload.컨디션, exercise: payload.운동, memo: payload.메모, weight: payload.몸무게, mealMemo: payload.식사메모 }),
      });
      const result = await res.json();
      if (result.success) {
        setDraftPageUrl(result.page_url || "saved");
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else throw new Error();
    } catch { setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 2500); }
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    const payload = buildPayload(dateLabel);
    try {
      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: payload.날짜, protein: payload.단백질, steps: payload.걸음수, water: payload.수분, sleep: payload.수면, condition: payload.컨디션, exercise: payload.운동, memo: payload.메모, weight: payload.몸무게, mealMemo: payload.식사메모 }),
      });
      const result = await res.json();
      if (result.success) {
        setRecords(r => ({ ...r, [selectedDate]: { ...payload, protein: estimatedProtein } }));
        setDraftPageUrl(null);
        setPendingDraft(null);
        fetch(`/api/notion-draft?date=${encodeURIComponent(dateLabel + " (임시)")}`, { method: "DELETE" }).catch(() => {});
        setSaveStatus("updated");
        setTimeout(() => { setSaveStatus("idle"); }, 2500);
      } else throw new Error();
    } catch { setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 2500); }
  };

  const statusConfig = {
    idle: { draft: { label: "📝 임시저장", color: C.cardAlt, text: C.textDim }, save: { label: "노션에 최종저장 →", color: C.gradient, text: "#0a0a0c" } },
    draft: { draft: { label: "저장 중...", color: C.cardAlt, text: C.textMuted }, save: { label: "노션에 최종저장 →", color: C.gradient, text: "#0a0a0c" } },
    saving: { draft: { label: "📝 임시저장", color: C.cardAlt, text: C.textDim }, save: { label: "업데이트 중...", color: C.cardAlt, text: C.textMuted } },
    saved: { draft: { label: "✅ 임시저장됨", color: C.limeDim, text: C.lime }, save: { label: "노션에 최종저장 →", color: C.gradient, text: "#0a0a0c" } },
    updated: { draft: { label: "📝 임시저장", color: C.cardAlt, text: C.textDim }, save: { label: "✅ 노션 업데이트 완료!", color: C.limeDim, text: C.lime } },
    error: { draft: { label: "📝 임시저장", color: C.cardAlt, text: C.textDim }, save: { label: "⚠️ 오류 발생", color: C.redDim, text: C.red } },
  };
  const sc = statusConfig[saveStatus] || statusConfig.idle;

  const weekGroups = {};
  Object.keys(records).forEach(date => {
    const ws = getWeekStart(date);
    (weekGroups[ws] = weekGroups[ws] || []).push(date);
  });

  return (
    <div style={{ fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", background: C.bg, minHeight: "100vh", color: C.text }}>
      <div style={{ background: "linear-gradient(180deg, #131316 0%, #0a0a0c 100%)", color: C.text, padding: "28px 20px 22px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: C.textMuted, marginBottom: 6, textTransform: "uppercase" }}>My Body Project</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>건강 관리 🐯</div>
        <div style={{ fontSize: 13, color: C.textDim }}>목표 걸음 1만보 · 단백질 74~99g/일</div>
        <a
          href={NOTION_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginTop: 12, background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 999, padding: "9px 16px", fontSize: 11, color: C.textDim, display: "flex", alignItems: "center", gap: 6, textDecoration: "none", cursor: "pointer" }}
        >
          <span style={{ color: C.lime }}>●</span> 노션 🐯 건강관리 기록 DB 연동됨
          <span style={{ marginLeft: "auto", color: C.lime, fontWeight: 700 }}>열기 →</span>
        </a>
      </div>

      <div style={{ display: "flex", gap: 6, padding: "10px 16px", background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        {TAB_LIST.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            flex: 1, padding: "10px 4px", border: "none",
            background: tab === i ? C.gradient : "transparent",
            fontSize: 12, fontWeight: tab === i ? 700 : 500,
            color: tab === i ? "#0a0a0c" : C.textMuted,
            borderRadius: 999,
            cursor: "pointer",
          }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto" }}>

        {tab === 0 && (
          <div>
            <div style={{ background: C.card, border: `1px solid ${C.borderSoft}`, borderRadius: 20, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>기록 날짜</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: isWeekend(selectedDate) ? C.red : C.text }}>{dateLabel} {isToday ? "· 오늘" : ""}</div>
              </div>
              <input
                type="date"
                value={selectedDate}
                max={toDateInput(new Date())}
                onChange={(e) => { setSelectedDate(e.target.value); setPendingDraft(null); setDraftPageUrl(null); setSaveStatus("idle"); }}
                style={{ border: `1px solid ${C.border}`, borderRadius: 999, padding: "7px 14px", fontSize: 13, color: C.text, background: C.cardAlt, cursor: "pointer", colorScheme: "dark" }}
              />
            </div>

            {pendingDraft && (
              <div style={{ background: C.limeDim, border: `1px solid ${C.lime}`, borderRadius: 16, padding: "12px 16px", marginBottom: 14, fontSize: 12, color: C.lime }}>
                <div style={{ marginBottom: 10 }}>
                  📝 임시저장된 기록이 있어요{pendingDraft.savedAt ? ` (${new Date(pendingDraft.savedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })} 저장)` : ""}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={restoreDraft} style={{ flex: 2, padding: "10px 0", background: C.gradient, color: "#0a0a0c", border: "none", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>이어서 작성</button>
                  <button onClick={() => setPendingDraft(null)} style={{ flex: 1, padding: "10px 0", background: C.cardAlt, color: C.textDim, border: "none", borderRadius: 999, fontSize: 13, cursor: "pointer" }}>닫기</button>
                </div>
              </div>
            )}

            {hasDraft && (
              <div style={{ background: C.limeDim, borderRadius: 16, padding: "10px 16px", marginBottom: 14, fontSize: 12, color: C.lime, display: "flex", alignItems: "center", gap: 6 }}>
                <span>📝</span> 노션에 임시저장됨 — 최종저장하면 업데이트돼요
              </div>
            )}

            <Section title={`${dateLabel} 식사 기록`} titleColor={isWeekend(selectedDate) ? C.red : undefined}>
              <div style={{ background: C.card, border: `1px solid ${C.borderSoft}`, borderRadius: 20, padding: "16px 18px", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: C.text }}>🍽️ 뭐 먹었어?</div>
                {["아침", "점심", "간식", "저녁", "기타"].map((meal) => (
                  <div key={meal} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 4 }}>{meal}</div>
                    <input
                      type="text"
                      placeholder={
                        meal === "아침" ? "커피 한 잔 (안 먹으면 비워두기)" :
                        meal === "점심" ? "닭가슴살, 양배추, 고구마" :
                        meal === "간식" ? "그릭요거트, 프로틴 쉐이크" :
                        meal === "저녁" ? "삼겹살 3줄, 양배추" : "기타"
                      }
                      value={form.meals[meal]}
                      onChange={(e) => setMeal(meal, e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                ))}
                {estimatedProtein > 0 && (
                  <div style={{
                    marginTop: 10,
                    background: estimatedProtein >= 74 ? C.gradient : C.orangeDim,
                    borderRadius: 999, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontSize: 12, color: estimatedProtein >= 74 ? "#0a0a0c" : C.orange }}>단백질 추정량</span>
                    <span style={{ fontWeight: 700, fontSize: 16, color: estimatedProtein >= 74 ? "#0a0a0c" : C.orange }}>
                      {estimatedProtein}g {estimatedProtein >= 74 ? "✅" : "⚠️ 목표 미달"}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 5 }}>걸음 수</div>
                  <input type="number" placeholder="10000" value={form.steps} onChange={(e) => setForm(f => ({ ...f, steps: e.target.value }))} style={inputStyle} />
                  {form.steps && Number(form.steps) > 13000 && <div style={{ fontSize: 10, color: C.red, marginTop: 3 }}>⚠️ 13,000보 초과</div>}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 5 }}>물 (L)</div>
                  <input type="number" placeholder="1.5" value={form.water} onChange={(e) => setForm(f => ({ ...f, water: e.target.value }))} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 5 }}>수면</div>
                  <input type="text" placeholder="23:00 ~ 07:00" value={form.sleep} onChange={(e) => setForm(f => ({ ...f, sleep: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 5 }}>컨디션</div>
                  <select value={form.condition} onChange={(e) => setForm(f => ({ ...f, condition: e.target.value }))} style={{ ...inputStyle, colorScheme: "dark" }}>
                    <option value="">선택</option>
                    {["최고 😄", "좋음 🙂", "보통 😐", "나쁨 😔", "최악 😩"].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 5 }}>운동</div>
                <input type="text" placeholder="뒷산 1시간, 스트레칭" value={form.exercise} onChange={(e) => setForm(f => ({ ...f, exercise: e.target.value }))} style={inputStyle} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 5 }}>메모</div>
                <input type="text" placeholder="오늘 특이사항 등" value={form.memo} onChange={(e) => setForm(f => ({ ...f, memo: e.target.value }))} style={inputStyle} />
              </div>

              <div style={{ marginBottom: 16 }}>
                {!showWeight ? (
                  <button onClick={() => setShowWeight(true)} style={{ width: "100%", padding: "12px", background: "transparent", color: C.textMuted, border: `1px dashed ${C.border}`, borderRadius: 999, fontSize: 13, cursor: "pointer" }}>
                    + 몸무게 추가하기
                  </button>
                ) : (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 5 }}>몸무게 (kg)</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="number" placeholder="62.0" value={form.weight} onChange={(e) => setForm(f => ({ ...f, weight: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
                      <button onClick={() => { setShowWeight(false); setForm(f => ({ ...f, weight: "" })); }} style={{ padding: "0 16px", background: C.cardAlt, border: "none", borderRadius: 999, fontSize: 13, cursor: "pointer", color: C.textDim }}>취소</button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                <button onClick={handleDraft} disabled={["draft", "saving"].includes(saveStatus)} style={{
                  padding: "14px 0", background: sc.draft.color, color: sc.draft.text,
                  border: "none", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                  {sc.draft.label}
                </button>
                <button onClick={handleSave} disabled={["draft", "saving"].includes(saveStatus)} style={{
                  padding: "14px 0", background: sc.save.color, color: sc.save.text,
                  border: "none", borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: "pointer",
                }}>
                  {sc.save.label}
                </button>
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 8 }}>
                임시저장 → 나중에 수정 → 최종저장하면 노션에 업데이트돼요
              </div>
            </Section>
          </div>
        )}

        {tab === 1 && (
          <div>
            <Section title={`기록 히스토리 (${Object.keys(records).length}일)`}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <button onClick={loadFromNotion} disabled={loadStatus === "loading"} style={{
                  padding: "7px 14px", background: C.cardAlt, border: `1px solid ${C.border}`,
                  borderRadius: 999, fontSize: 12, color: C.textDim, cursor: "pointer"
                }}>
                  {loadStatus === "loading" ? "불러오는 중..." : "🔄 새로고침"}
                </button>
              </div>
              {loadStatus === "loading" ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: C.textMuted, fontSize: 14 }}>
                  노션에서 기록 불러오는 중...
                </div>
              ) : loadStatus === "error" ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: C.red, fontSize: 13 }}>
                  불러오기 실패 😢<br />
                  <span style={{ fontSize: 11, color: C.textMuted }}>새로고침 버튼을 눌러봐요</span>
                </div>
              ) : (
                <>
                  <div style={{ background: C.card, border: `1px solid ${C.borderSoft}`, borderRadius: 22, padding: "18px 16px", marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <button onClick={() => setCalendarMonth(m => addMonths(m, -1))} style={calNavBtnStyle}>◀</button>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{monthLabel(calendarMonth)}</div>
                      <button onClick={() => setCalendarMonth(m => addMonths(m, 1))} style={calNavBtnStyle}>▶</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 8 }}>
                      {DAY_NAMES.map(d => (
                        <div key={d} style={{ textAlign: "center", fontSize: 10, color: C.textMuted }}>{d}</div>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
                      {getMonthMeta(calendarMonth).map((date, i) => {
                        if (!date) return <div key={`blank-${i}`} />;
                        const hasRecord = !!records[date];
                        const isToday = date === toDateInput(new Date());
                        const isInExpandedWeek = expandedWeek && getWeekStart(date) === expandedWeek;
                        const dayNum = Number(date.slice(8, 10));
                        return (
                          <button
                            key={date}
                            onClick={() => toggleWeek(getWeekStart(date))}
                            style={{
                              aspectRatio: "1", borderRadius: "50%",
                              border: isToday ? `2px solid ${C.lime}` : isInExpandedWeek ? `1px solid ${C.lime}` : "1px solid transparent",
                              background: hasRecord ? C.gradient : C.cardAlt,
                              color: hasRecord ? "#0a0a0c" : C.textMuted,
                              fontSize: 11, fontWeight: hasRecord ? 700 : 500, cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                            }}
                          >
                            {dayNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {Object.keys(records).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: C.textMuted, fontSize: 14 }}>
                      아직 기록이 없어요<br />
                      <span style={{ fontSize: 12 }}>오늘 기록 탭에서 첫 기록을 남겨봐요 😄</span>
                    </div>
                  ) : !expandedWeek ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: C.textMuted, fontSize: 12 }}>
                      달력에서 라임색으로 표시된 날짜를 눌러보세요
                    </div>
                  ) : (() => {
                    const dates = (weekGroups[expandedWeek] || []).sort((a, b) => b.localeCompare(a));
                    const note = weeklyNotes[expandedWeek];
                    return (
                      <div style={{ background: C.cardAlt, border: `1px solid ${C.borderSoft}`, borderRadius: 20, padding: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 12 }}>{weekRangeLabel(expandedWeek)}</div>
                        <div style={{ marginBottom: 14 }}>
                          {!note || note.status === "loading" ? (
                            <div style={{ textAlign: "center", padding: "16px 0", fontSize: 12, color: C.textMuted }}>
                              불러오는 중...
                            </div>
                          ) : note.editing ? (
                            <>
                              <WeeklyNoteField
                                label="🐯 이번 주 총평"
                                value={note.text}
                                onChange={(v) => updateWeeklyNoteText(expandedWeek, v)}
                                placeholder="이번 주 총평을 적어보세요 (잘한 점, 보완점, 수정할 점 등)"
                                rows={5}
                              />
                              <button
                                onClick={() => saveWeeklyNote(expandedWeek)}
                                disabled={note.status === "saving"}
                                style={{
                                  width: "100%", marginTop: 4, padding: "11px 0",
                                  background: note.status === "saved" ? C.limeDim : note.status === "error" ? C.redDim : C.gradient,
                                  color: note.status === "saved" ? C.lime : note.status === "error" ? C.red : "#0a0a0c",
                                  border: "none", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer",
                                }}
                              >
                                {note.status === "saving" ? "저장 중..." : note.status === "saved" ? "✅ 저장됨" : note.status === "error" ? "⚠️ 저장 실패, 다시 시도" : "저장"}
                              </button>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 5 }}>🐯 이번 주 총평</div>
                              <div style={{
                                background: C.card, borderLeft: `3px solid ${C.lime}`, borderRadius: 14, padding: "12px 14px",
                                fontSize: 13, color: C.text, whiteSpace: "pre-line", marginBottom: 8,
                              }}>
                                {note.text}
                              </div>
                              <button
                                onClick={() => startEditingWeeklyNote(expandedWeek)}
                                style={{
                                  width: "100%", padding: "10px 0", background: "transparent", color: C.textDim,
                                  border: `1px solid ${C.border}`, borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer",
                                }}
                              >
                                ✏️ 수정
                              </button>
                            </>
                          )}
                        </div>

                        {dates.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "16px 0", color: C.textMuted, fontSize: 12 }}>
                            이 주는 기록이 없어요
                          </div>
                        ) : dates.map(date => {
                          const r = records[date];
                          const hasNote = r["식사메모"] || r["메모"];
                          return (
                            <div key={date} style={{ background: C.card, border: `1px solid ${C.borderSoft}`, borderRadius: 18, padding: "14px 16px", marginBottom: 10 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: isWeekend(date) ? C.red : C.textDim, marginBottom: 8 }}>{formatKR(fromDateInput(date))}</div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: hasNote ? 8 : 0 }}>
                                <div style={{ gridColumn: "1 / -1" }}>
                                  <MiniStat label="단백질" value={`${r.protein || 0}g`} highlight={(r.protein || 0) >= 74} big />
                                </div>
                                <MiniStat label="걸음" value={`${Number(r["걸음수"] || 0).toLocaleString()}보`} warn={Number(r["걸음수"] || 0) > 13000} />
                                <MiniStat label="물" value={`${r["수분"] || 0}L`} />
                                <MiniStat label="수면" value={r["수면"] || "-"} />
                                <MiniStat label="컨디션" value={r["컨디션"] || "-"} />
                                <MiniStat label="운동" value={r["운동"] || "-"} />
                                <MiniStat label="몸무게" value={r["몸무게"] ? `${r["몸무게"]}kg` : "-"} />
                              </div>
                              {hasNote && (
                                <div style={{ paddingTop: 8, borderTop: `1px solid ${C.borderSoft}` }}>
                                  {r["식사메모"] && <div style={{ fontSize: 11, color: C.textDim, whiteSpace: "pre-line" }}>{r["식사메모"]}</div>}
                                  {r["메모"] && <div style={{ fontSize: 11, color: C.textMuted, whiteSpace: "pre-line", marginTop: r["식사메모"] ? 6 : 0 }}>📌 {r["메모"]}</div>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </>
              )}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children, titleColor }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: titleColor || C.textMuted, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>{title}</div>
      {children}
    </div>
  );
}

function WeeklyNoteField({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 5 }}>{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: "100%", padding: "12px 14px", border: `1px solid ${C.border}`,
          borderRadius: 16, fontSize: 13, background: C.card, outline: "none",
          boxSizing: "border-box", color: C.text, resize: "vertical", fontFamily: "inherit",
        }}
      />
    </div>
  );
}

function MiniStat({ label, value, highlight, warn, big }) {
  const bg = warn ? C.redDim : highlight ? C.limeDim : C.cardAlt;
  const color = warn ? C.red : highlight ? C.lime : C.text;
  return (
    <div style={{ background: bg, borderRadius: big ? 16 : 14, padding: big ? "12px 14px" : "8px 12px", display: big ? "flex" : "block", justifyContent: big ? "space-between" : undefined, alignItems: big ? "center" : undefined }}>
      <div style={{ fontSize: big ? 11 : 10, color: C.textMuted }}>{label}</div>
      <div style={{ fontSize: big ? 18 : 13, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const calNavBtnStyle = {
  width: 28, height: 28, borderRadius: "50%", border: "none",
  background: C.cardAlt, color: C.textDim, fontSize: 11, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

const inputStyle = {
  width: "100%", padding: "12px 16px", border: `1px solid ${C.border}`,
  borderRadius: 14, fontSize: 14, background: C.cardAlt,
  outline: "none", boxSizing: "border-box", color: C.text,
};
