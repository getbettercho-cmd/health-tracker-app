"use client";
import { useState, useEffect, useRef } from "react";

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
  const diff = (d.getDay() + 6) % 7; // 월요일 시작 (월~일)
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

// 수면: [오전/오후] 시 : 분 두 묶음 (취침 기본 오후, 기상 기본 오전). 노션에는 "오후 11:30 ~ 오전 7:00" 형태로 저장
const EMPTY_SLEEP_START = { ap: "오후", h: "", m: "" };
const EMPTY_SLEEP_END = { ap: "오전", h: "", m: "" };

function fmtSleepTime(t) {
  if (!t || t.h === "") return "";
  return `${t.ap} ${parseInt(t.h, 10)}:${String(parseInt(t.m || "0", 10)).padStart(2, "0")}`;
}
function serializeSleep(start, end) {
  const a = fmtSleepTime(start), b = fmtSleepTime(end);
  if (!a && !b) return null;
  return `${a} ~ ${b}`.trim();
}
function parseSleepTime(str, defaultAp) {
  const base = { ap: defaultAp, h: "", m: "" };
  if (!str) return base;
  const k = str.match(/(오전|오후)\s*(\d{1,2})\s*:\s*(\d{1,2})/);
  if (k) return { ap: k[1], h: String(parseInt(k[2], 10)), m: k[3].padStart(2, "0") };
  const t = str.match(/(\d{1,2})\s*:\s*(\d{2})/); // 예전 기록 "23:00 ~ 07:00" (24시간제)
  if (t) { const h24 = parseInt(t[1], 10); return { ap: h24 >= 12 ? "오후" : "오전", h: String(h24 % 12 || 12), m: t[2] }; }
  return base;
}
function parseSleep(text) {
  const [a = "", b = ""] = (text || "").split("~");
  return [parseSleepTime(a, "오후"), parseSleepTime(b, "오전")];
}

const EMPTY_FORM = { meals: { 아침: [], 점심: [], 간식: [], 저녁: [], 기타: "" }, steps: "", water: "", sleepStart: EMPTY_SLEEP_START, sleepEnd: EMPTY_SLEEP_END, condition: "", exercise: "", memo: "", weight: "" };

// 끼니는 "음식 칩" 배열로 관리 (기타만 자유 텍스트)
const MEAL_KEYS = ["아침", "점심", "간식", "저녁"];
const GOAL_PROTEIN = 74;
const FOODS_CACHE_KEY = "health-foods-v1";

const uid = () => Math.random().toString(36).slice(2, 9);
const toNum = (v) => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? n : 0; };
const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const sumProtein = (chips) => (chips || []).reduce((s, c) => s + (Number(c.protein) || 0), 0);
const sumKcal = (chips) => (chips || []).reduce((s, c) => s + (Number(c.kcal) || 0), 0);
const cleanName = (s) => s.trim().replace(/,/g, " ").replace(/\s+/g, " ");
const normName = (s) => s.replace(/\s/g, "").toLowerCase();

function readFoodsCache() {
  try { const raw = localStorage.getItem(FOODS_CACHE_KEY); const v = raw ? JSON.parse(raw) : []; return Array.isArray(v) ? v : []; } catch { return []; }
}
function writeFoodsCache(foods) {
  try { localStorage.setItem(FOODS_CACHE_KEY, JSON.stringify(foods)); } catch {}
}

// 노션에는 "계란2개 (13g), 닭가슴살 (23g)" 형태로 저장 → 불러올 때 다시 칩으로 복원
function serializeChips(chips) {
  return chips.map((c) => `${c.name} (${round1(c.protein)}g)`).join(", ");
}
function parseMealText(text, foods) {
  return text.split(",").map((s) => s.trim()).filter(Boolean).map((part) => {
    const m = part.match(/^(.*?)\s*\((\d+(?:\.\d+)?)g\)$/);
    const name = m ? m[1] : part;
    const food = foods.find((f) => normName(f.name) === normName(name));
    return { id: uid(), name, protein: m ? parseFloat(m[2]) : food ? food.protein : estimateProtein(part), kcal: food ? food.kcal : 0 };
  });
}
const EMPTY_WEEKLY_NOTE = { text: "", editing: true };

const TAB_LIST = ["📊 기록 히스토리", "📝 오늘 기록", "🍚 음식 목록"];
const DEFAULT_TAB = 1; // 앱을 열면 "오늘 기록"이 먼저 보이도록

async function callNotion(prompt) {
  const res = await fetch("/api/notion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  return res.json();
}

export default function HealthGuide() {
  const [tab, setTab] = useState(DEFAULT_TAB);
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
  const [foods, setFoods] = useState(readFoodsCache);
  const [foodSync, setFoodSync] = useState("idle");
  const [editingMeal, setEditingMeal] = useState(null);
  const foodSaveQueue = useRef(Promise.resolve());

  useEffect(() => {
    loadFromNotion();
  }, []);

  // 음식 목록: 노션(FOODS_LIST 페이지)에 저장 + 이 기기 localStorage에 캐시
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/foods");
        const result = await res.json();
        if (result.success && result.found && Array.isArray(result.foods)) {
          setFoods(result.foods);
          writeFoodsCache(result.foods);
        }
      } catch {}
    })();
  }, []);

  const persistFoods = (next) => {
    setFoods(next);
    writeFoodsCache(next);
    setFoodSync("saving");
    foodSaveQueue.current = foodSaveQueue.current.then(async () => {
      try {
        const res = await fetch("/api/foods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ foods: next }) });
        const result = await res.json();
        if (!result.success) throw new Error();
        setFoodSync("saved");
        setTimeout(() => setFoodSync((s) => (s === "saved" ? "idle" : s)), 1500);
      } catch { setFoodSync("error"); }
    });
  };
  const addFood = (item) => persistFoods([...foods, { id: uid(), fav: false, ...item }]);
  const updateFood = (id, item) => persistFoods(foods.map((f) => (f.id === id ? { ...f, ...item } : f)));
  const deleteFood = (id) => persistFoods(foods.filter((f) => f.id !== id));
  const toggleFav = (id) => persistFoods(foods.map((f) => (f.id === id ? { ...f, fav: !f.fav } : f)));
  const saveFoodFromMeal = (item) => {
    if (foods.some((f) => normName(f.name) === normName(item.name))) return;
    addFood(item);
  };

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
    const meals = { 아침: [], 점심: [], 간식: [], 저녁: [], 기타: "" };
    (d.mealMemo || "").split("\n").forEach((line) => {
      const m = line.match(/^\[(아침|점심|간식|저녁|기타)\]\s?(.*)$/);
      if (!m) return;
      if (m[1] === "기타") meals.기타 = m[2];
      else meals[m[1]] = parseMealText(m[2], foods);
    });
    const [sleepStart, sleepEnd] = parseSleep(d.sleep);
    setForm({
      meals,
      steps: d.steps ? String(d.steps) : "",
      water: d.water ? String(d.water) : "",
      sleepStart,
      sleepEnd,
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

  const mealProteins = MEAL_KEYS.map((k) => sumProtein(form.meals[k]));
  const etcProtein = estimateProtein(form.meals.기타);
  const exactProtein = mealProteins.reduce((a, b) => a + b, 0) + etcProtein;
  const estimatedProtein = Math.round(exactProtein);
  const dateLabel = formatKR(fromDateInput(selectedDate));
  const isToday = selectedDate === toDateInput(new Date());
  const hasDraft = !!draftPageUrl;

  const buildPayload = (dateStr) => {
    const mealLines = MEAL_KEYS.filter((k) => form.meals[k].length).map((k) => `[${k}] ${serializeChips(form.meals[k])}`);
    if (form.meals.기타.trim()) mealLines.push(`[기타] ${form.meals.기타.trim()}`);
    const mealSummary = mealLines.join("\n");
    return {
      날짜: dateStr,
      식사메모: mealSummary || null,
      단백질: estimatedProtein || null,
      걸음수: form.steps ? parseFloat(form.steps) : null,
      수분: form.water ? parseFloat(form.water) : null,
      수면: serializeSleep(form.sleepStart, form.sleepEnd),
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

        {tab === 1 && (
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
              {editingMeal ? (
                <MealEditor
                  key={editingMeal}
                  meal={editingMeal}
                  chips={form.meals[editingMeal]}
                  foods={foods}
                  otherProtein={exactProtein - mealProteins[MEAL_KEYS.indexOf(editingMeal)]}
                  onChange={(chips) => setForm((f) => ({ ...f, meals: { ...f.meals, [editingMeal]: chips } }))}
                  onDone={() => setEditingMeal(null)}
                  onSaveFood={saveFoodFromMeal}
                  onToggleFav={toggleFav}
                />
              ) : (
                <MealCards
                  meals={form.meals}
                  proteins={mealProteins}
                  etcProtein={etcProtein}
                  onOpen={setEditingMeal}
                  onEtcChange={(v) => setForm((f) => ({ ...f, meals: { ...f.meals, 기타: v } }))}
                />
              )}

              {!editingMeal && (<>

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

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 5 }}>수면 <span style={{ fontWeight: 400 }}>· 오전/오후를 누르면 바뀌어요</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <SleepTime idPrefix="sleep-start" value={form.sleepStart} onPatch={(patch) => setForm((f) => ({ ...f, sleepStart: { ...f.sleepStart, ...patch } }))} />
                  <span style={{ color: C.textMuted }}>-</span>
                  <SleepTime idPrefix="sleep-end" value={form.sleepEnd} onPatch={(patch) => setForm((f) => ({ ...f, sleepEnd: { ...f.sleepEnd, ...patch } }))} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 5 }}>컨디션</div>
                <select value={form.condition} onChange={(e) => setForm(f => ({ ...f, condition: e.target.value }))} style={{ ...inputStyle, colorScheme: "dark" }}>
                  <option value="">선택</option>
                  {["최고 😄", "좋음 🙂", "보통 😐", "나쁨 😔", "최악 😩"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
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
              </>)}
            </Section>
          </div>
        )}

        {tab === 0 && (
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
        {tab === 2 && (
          <FoodsTab foods={foods} sync={foodSync} onAdd={addFood} onUpdate={updateFood} onDelete={deleteFood} onToggleFav={toggleFav} />
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

// ─────────────────────────────────────────────
// 음식 목록 / 끼니 입력 (알약 칩) 컴포넌트
// ─────────────────────────────────────────────

function ProteinBar({ segments, goal }) {
  const widths = segments.reduce((acc, s) => {
    const prev = acc.reduce((a, b) => a + b, 0);
    acc.push(Math.max(0, Math.min(((s.value || 0) / goal) * 100, 100 - prev)));
    return acc;
  }, []);
  return (
    <div style={{ display: "flex", gap: 2, height: 14, background: C.cardAlt, borderRadius: 999, overflow: "hidden" }}>
      {segments.map((s, i) => widths[i] > 0 ? <div key={i} style={{ width: `${widths[i]}%`, background: s.color }} /> : null)}
    </div>
  );
}

const SEGMENT_COLORS = [C.lime, C.mint, "#B7E84A", "#5FE0A0", "#9DF07C"];

function MealCards({ meals, proteins, etcProtein, onOpen, onEtcChange }) {
  const total = round1(proteins.reduce((a, b) => a + b, 0) + etcProtein);
  const parts = [...proteins, etcProtein].filter((p) => p > 0).map(round1);
  const segments = [...proteins, etcProtein].map((v, i) => ({ value: v, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }));
  return (
    <div style={{ marginBottom: 14 }}>
      {MEAL_KEYS.map((k, i) => (
        <button key={k} onClick={() => onOpen(k)} style={{
          width: "100%", textAlign: "left", background: C.card, border: `1px solid ${C.borderSoft}`, borderRadius: 20,
          padding: "14px 18px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
          color: C.text, fontFamily: "inherit",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{k}</div>
            <div style={{ fontSize: 12, color: meals[k].length ? C.textDim : C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {meals[k].length ? meals[k].map((c) => c.name).join(", ") : "눌러서 음식 추가"}
            </div>
          </div>
          {proteins[i] > 0 && <span style={{ fontSize: 12, color: C.lime, fontWeight: 700 }}>{round1(proteins[i])}g</span>}
          <span style={{ color: C.textMuted, fontSize: 18 }}>›</span>
        </button>
      ))}

      <div style={{ background: C.card, border: `1px solid ${C.borderSoft}`, borderRadius: 20, padding: "14px 18px", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>기타</div>
        <input type="text" placeholder="커피 한 잔 (프로틴 없는 것들)" value={meals.기타} onChange={(e) => onEtcChange(e.target.value)} style={inputStyle} />
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.borderSoft}`, borderRadius: 20, padding: "14px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>오늘의 프로틴</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: total >= GOAL_PROTEIN ? C.lime : C.text }}>
            {total}g{parts.length > 1 ? `(${parts.join("+")})` : ""}{" "}
            <span style={{ color: C.textMuted, fontWeight: 500 }}>/ {GOAL_PROTEIN}g</span>
          </span>
        </div>
        <ProteinBar segments={segments} goal={GOAL_PROTEIN} />
      </div>
    </div>
  );
}

function MealEditor({ meal, chips, foods, otherProtein, onChange, onDone, onSaveFood, onToggleFav }) {
  const [query, setQuery] = useState("");
  const [directProtein, setDirectProtein] = useState("");
  const [directKcal, setDirectKcal] = useState("");
  const [saveToList, setSaveToList] = useState(false);

  const q = normName(query);
  const matches = q ? foods.filter((f) => normName(f.name).includes(q)).slice(0, 6) : [];
  const favs = foods.filter((f) => f.fav);
  const quick = (favs.length ? favs : foods).slice(0, 8);
  const mealProtein = sumProtein(chips);
  const mealKcal = sumKcal(chips);
  const total = otherProtein + mealProtein;

  const addFromList = (f) => {
    onChange([...chips, { id: uid(), name: f.name, protein: f.protein, kcal: f.kcal }]);
    setQuery("");
  };
  const addDirect = () => {
    const name = cleanName(query);
    if (!name) return;
    const chip = { id: uid(), name, protein: toNum(directProtein), kcal: toNum(directKcal) };
    onChange([...chips, chip]);
    if (saveToList) onSaveFood({ name, protein: chip.protein, kcal: chip.kcal });
    setQuery(""); setDirectProtein(""); setDirectKcal("");
  };
  const removeChip = (id) => onChange(chips.filter((c) => c.id !== id));

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>{meal}</div>

      <input
        type="text"
        placeholder="음식 검색 또는 직접 입력"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (matches[0]) addFromList(matches[0]); else addDirect(); } }}
        style={inputStyle}
      />

      {query.trim() && (
        <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 18, padding: "8px 14px", marginTop: 8 }}>
          {matches.map((f) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
              <button onClick={() => onToggleFav(f.id)} aria-label="자주 쓰는 음식 토글" style={{ background: "none", border: "none", color: f.fav ? C.lime : C.textMuted, fontSize: 16, cursor: "pointer", padding: 0 }}>{f.fav ? "★" : "☆"}</button>
              <button onClick={() => addFromList(f)} style={{ flex: 1, display: "flex", justifyContent: "space-between", background: "none", border: "none", color: C.text, fontSize: 13, cursor: "pointer", padding: 0, fontFamily: "inherit", textAlign: "left" }}>
                <span>{f.name}</span>
                <span style={{ color: C.textDim }}>{f.kcal}kcal · {round1(f.protein)}g</span>
              </button>
            </div>
          ))}
          <div style={{ padding: "12px 0 6px" }}>
            <div style={{ fontSize: 13, marginBottom: 10 }}><b>{query.trim()}</b> <span style={{ color: C.textDim }}>직접 추가하기</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <input type="number" inputMode="decimal" placeholder="단백질(g)" value={directProtein} onChange={(e) => setDirectProtein(e.target.value)} style={inputStyle} />
              <input type="number" inputMode="decimal" placeholder="칼로리(선택)" value={directKcal} onChange={(e) => setDirectKcal(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textDim }}>
                음식 목록에 저장
                <button onClick={() => setSaveToList((v) => !v)} aria-pressed={saveToList} style={{ width: 44, height: 26, borderRadius: 999, border: "none", background: saveToList ? C.lime : C.card, position: "relative", cursor: "pointer" }}>
                  <span style={{ position: "absolute", top: 3, left: saveToList ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: saveToList ? "#0a0a0c" : C.textMuted, transition: "left .15s" }} />
                </button>
              </label>
              <button onClick={addDirect} style={{ padding: "10px 24px", background: C.gradient, color: "#0a0a0c", border: "none", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>추가</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "14px 0" }}>
        {chips.length === 0 && <span style={{ fontSize: 12, color: C.textMuted }}>아직 추가한 음식이 없어요</span>}
        {chips.map((c) => (
          <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.lime, color: "#0a0a0c", borderRadius: 999, padding: "8px 10px 8px 16px", fontSize: 13, fontWeight: 600 }}>
            {c.name}
            <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 500 }}>{round1(c.protein)}g</span>
            <button onClick={() => removeChip(c.id)} aria-label={`${c.name} 삭제`} style={{ background: "none", border: "none", color: "#0a0a0c", opacity: 0.55, fontSize: 15, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>✕</button>
          </span>
        ))}
      </div>

      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{favs.length ? "자주 쓰는 음식" : "음식 목록에서 빠르게 추가"}</div>
      {foods.length === 0 ? (
        <div style={{ fontSize: 12, color: C.textMuted, background: C.card, borderRadius: 16, padding: "12px 14px", marginBottom: 14 }}>
          🍚 <b>음식 목록</b> 탭에서 자주 먹는 음식을 등록하면 여기서 한 번에 추가할 수 있어요.
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {quick.map((f) => (
            <button key={f.id} onClick={() => addFromList(f)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.text, borderRadius: 999, padding: "9px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              <span style={{ color: C.textMuted, marginRight: 4 }}>+</span>{f.name}
            </button>
          ))}
        </div>
      )}

      <div style={{ background: C.card, border: `1px solid ${C.borderSoft}`, borderRadius: 20, padding: "14px 18px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>오늘의 프로틴</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: total >= GOAL_PROTEIN ? C.lime : C.text }}>
            {round1(total)}g <span style={{ color: C.textMuted, fontWeight: 500 }}>/ {GOAL_PROTEIN}g</span>
          </span>
        </div>
        <ProteinBar segments={[{ value: otherProtein, color: "rgba(215,255,62,0.35)" }, { value: mealProtein, color: C.lime }]} goal={GOAL_PROTEIN} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 11, color: C.textDim, marginTop: 10 }}>
          <span>다른 끼니 <b style={{ color: C.text }}>{round1(otherProtein)}g</b></span>
          <span>이번 끼니 <b style={{ color: C.lime }}>+{round1(mealProtein)}g</b></span>
          <span>목표까지 <b style={{ color: C.text }}>{round1(Math.max(0, GOAL_PROTEIN - total))}g</b></span>
          {mealKcal > 0 && <span>이번 끼니 약 <b style={{ color: C.text }}>{Math.round(mealKcal)}kcal</b></span>}
        </div>
      </div>

      <button onClick={onDone} style={{ width: "100%", padding: "15px 0", background: C.gradient, color: "#0a0a0c", border: "none", borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>완료</button>
    </div>
  );
}

function FoodsTab({ foods, sync, onAdd, onUpdate, onDelete, onToggleFav }) {
  const [mode, setMode] = useState(null); // null | "add" | food id (수정 중)
  const [draft, setDraft] = useState({ name: "", kcal: "", protein: "" });
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  const openAdd = () => { setDraft({ name: "", kcal: "", protein: "" }); setErr(""); setMode("add"); };
  const openEdit = (f) => { setDraft({ name: f.name, kcal: f.kcal ? String(f.kcal) : "", protein: f.protein ? String(f.protein) : "" }); setErr(""); setMode(f.id); };
  const submit = () => {
    const name = cleanName(draft.name);
    if (!name) { setErr("음식명을 입력해 주세요"); return; }
    const editingId = mode === "add" ? null : mode;
    if (foods.some((f) => f.id !== editingId && normName(f.name) === normName(name))) { setErr("이미 목록에 있는 음식이에요"); return; }
    const item = { name, kcal: toNum(draft.kcal), protein: toNum(draft.protein) };
    if (editingId) onUpdate(editingId, item); else onAdd(item);
    setMode(null);
  };

  const shown = query.trim() ? foods.filter((f) => normName(f.name).includes(normName(query))) : foods;
  const syncLabel = sync === "saving" ? "저장 중…" : sync === "saved" ? "✅ 저장됨" : sync === "error" ? "⚠️ 노션 저장 실패 (이 기기에는 저장됨)" : "";
  const cols = "28px 1fr 58px 52px 58px";

  const form = (
    <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 20, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{mode === "add" ? "음식 추가" : "음식 수정"}</div>
      <input type="text" placeholder="음식명 (예: 계란 2개)" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} style={{ ...inputStyle, marginBottom: 8, background: C.card }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <input type="number" inputMode="decimal" placeholder="칼로리 (kcal)" value={draft.kcal} onChange={(e) => setDraft((d) => ({ ...d, kcal: e.target.value }))} style={{ ...inputStyle, background: C.card }} />
        <input type="number" inputMode="decimal" placeholder="단백질 (g)" value={draft.protein} onChange={(e) => setDraft((d) => ({ ...d, protein: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} style={{ ...inputStyle, background: C.card }} />
      </div>
      {err && <div style={{ fontSize: 11, color: C.red, marginBottom: 8 }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
        <button onClick={() => setMode(null)} style={{ padding: "12px 0", background: C.card, color: C.textDim, border: "none", borderRadius: 999, fontSize: 13, cursor: "pointer" }}>취소</button>
        <button onClick={submit} style={{ padding: "12px 0", background: C.gradient, color: "#0a0a0c", border: "none", borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{mode === "add" ? "추가" : "저장"}</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: 1 }}>음식 목록 ({foods.length})</div>
          {syncLabel && <div style={{ fontSize: 10, color: sync === "error" ? C.red : C.textMuted, marginTop: 3 }}>{syncLabel}</div>}
        </div>
        <button onClick={openAdd} style={{ padding: "10px 18px", background: C.gradient, color: "#0a0a0c", border: "none", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ 음식 추가</button>
      </div>

      {mode && form}

      {foods.length > 5 && (
        <input type="text" placeholder="음식 검색" value={query} onChange={(e) => setQuery(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
      )}

      {foods.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.textMuted, fontSize: 13, lineHeight: 1.7 }}>
          아직 등록한 음식이 없어요<br />
          <span style={{ fontSize: 12 }}>자주 먹는 음식을 등록해 두면<br />오늘 기록에서 알약(칩)으로 바로 추가할 수 있어요</span>
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.borderSoft}`, borderRadius: 20, padding: "6px 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: cols, gap: 4, padding: "10px 0", fontSize: 10, color: C.textMuted, borderBottom: `1px solid ${C.borderSoft}` }}>
            <span />
            <span>음식명</span>
            <span style={{ textAlign: "right" }}>칼로리</span>
            <span style={{ textAlign: "right" }}>단백질</span>
            <span />
          </div>
          {shown.map((f, i) => (
            <div key={f.id} style={{ display: "grid", gridTemplateColumns: cols, gap: 4, alignItems: "center", padding: "10px 0", borderBottom: i < shown.length - 1 ? `1px solid ${C.borderSoft}` : "none", fontSize: 13 }}>
              <button onClick={() => onToggleFav(f.id)} aria-label="자주 쓰는 음식 토글" style={{ background: "none", border: "none", color: f.fav ? C.lime : C.textMuted, fontSize: 16, cursor: "pointer", padding: 0 }}>{f.fav ? "★" : "☆"}</button>
              <span style={{ wordBreak: "keep-all" }}>{f.name}</span>
              <span style={{ textAlign: "right", color: C.textDim }}>{f.kcal}<span style={{ fontSize: 9 }}>kcal</span></span>
              <span style={{ textAlign: "right", color: C.lime, fontWeight: 700 }}>{round1(f.protein)}<span style={{ fontSize: 9, fontWeight: 500 }}>g</span></span>
              <span style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                <button onClick={() => openEdit(f)} aria-label="수정" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: 2 }}>✏️</button>
                {confirmId === f.id ? (
                  <button onClick={() => { onDelete(f.id); setConfirmId(null); }} style={{ background: C.redDim, border: "none", color: C.red, borderRadius: 999, fontSize: 10, padding: "3px 7px", cursor: "pointer" }}>삭제?</button>
                ) : (
                  <button onClick={() => { setConfirmId(f.id); setTimeout(() => setConfirmId((c) => (c === f.id ? null : c)), 3000); }} aria-label="삭제" style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 13, padding: 2 }}>✕</button>
                )}
              </span>
            </div>
          ))}
          {shown.length === 0 && <div style={{ textAlign: "center", padding: "20px 0", fontSize: 12, color: C.textMuted }}>검색 결과가 없어요</div>}
        </div>
      )}
      <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
        ★ 표시한 음식은 오늘 기록의 &quot;자주 쓰는 음식&quot;에 바로 보여요
      </div>
    </div>
  );
}

function SleepTime({ value, onPatch, idPrefix }) {
  const set = (patch) => onPatch(patch); // 부모가 최신 상태에 patch를 합쳐서 반영 (blur 시 이전 값으로 덮어쓰는 문제 방지)
  const focusMinute = () => document.getElementById(`${idPrefix}-m`)?.focus();

  const onHour = (raw) => {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    set({ h: digits });
    if (digits.length === 2 || (digits.length === 1 && Number(digits) >= 2)) focusMinute();
  };
  const blurHour = (e) => {
    const raw = e.target.value; // 화면에 입력된 현재 값 기준
    if (raw === "") return;
    const n = parseInt(raw, 10);
    if (n >= 13 && n <= 23) set({ h: String(n - 12), ap: "오후" }); // 24시간제로 입력해도 자동 변환
    else if (n === 0) set({ h: "12", ap: "오전" });
    else if (n > 23) set({ h: "12" });
    else set({ h: String(n) });
  };
  const onMinute = (raw) => set({ m: raw.replace(/\D/g, "").slice(0, 2) });
  const blurMinute = (e) => {
    const raw = e.target.value;
    if (raw === "") return;
    set({ m: String(Math.min(59, parseInt(raw, 10))).padStart(2, "0") });
  };

  const numStyle = { width: 34, border: "none", background: "transparent", outline: "none", color: C.text, fontSize: 16, textAlign: "center", padding: 0, fontFamily: "inherit" };
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, border: `1px solid ${C.border}`, borderRadius: 999, background: C.cardAlt, padding: "9px 10px" }}>
      <button
        type="button"
        onClick={() => set({ ap: value.ap === "오전" ? "오후" : "오전" })}
        aria-label={`${value.ap} (눌러서 전환)`}
        style={{ background: C.card, border: "none", borderRadius: 999, color: C.lime, fontSize: 13, fontWeight: 700, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit" }}
      >{value.ap}</button>
      <input id={`${idPrefix}-h`} type="text" inputMode="numeric" placeholder="시" aria-label="시" value={value.h} onChange={(e) => onHour(e.target.value)} onBlur={blurHour} style={numStyle} />
      <span style={{ color: C.textMuted }}>:</span>
      <input id={`${idPrefix}-m`} type="text" inputMode="numeric" placeholder="분" aria-label="분" value={value.m} onChange={(e) => onMinute(e.target.value)} onBlur={blurMinute} style={numStyle} />
    </div>
  );
}
