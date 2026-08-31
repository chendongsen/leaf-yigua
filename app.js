import { HEXAGRAMS, frontsToBits, resolveHexagram } from "./hexagram-engine.js";
import { answerQuestion } from "./question-answer.js";
import { getReading } from "./reading-data.js";
import { renderHexagramReading } from "./reading-view.js";
import { setupLeafCamera } from "./camera-controller.js";

const leaves = Array.from({ length: 6 }, (_, index) => ({ index: index + 1, front: true }));
const SETTINGS_KEY = "leaf-yigua-front-is-yang-v1";
let frontIsYang = loadFrontSetting();
const HISTORY_KEY = "leaf-yigua-history-v1";
let history = loadHistory();
let castAt = new Date().toISOString();
let confirmedQuestion = "";
let lastRecognition = null;
const $ = (id) => document.getElementById(id);

function loadFrontSetting() {
  try { return localStorage.getItem(SETTINGS_KEY) !== "false"; } catch { return true; }
}

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(saved) ? saved.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function persistHistory() {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* private mode or blocked storage */ }
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

function fileDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toISOString().slice(0, 10);
}

function updateQuestionCount() {
  $("questionCount").textContent = `${$("questionInput").value.length} / 120`;
}

function renderHistory() {
  const list = $("historyList");
  if (!history.length) {
    list.innerHTML = '<p class="history-empty">还没有保存的卦象</p>';
    return;
  }
  list.innerHTML = history.map((item, index) => {
    const hexagram = item.hexagram || item;
    const time = item.castAt ? formatDateTime(item.castAt) : (item.time || "时间未知");
    return `
    <button class="history-item" type="button" data-history-index="${index}" title="恢复这次起卦">
      <span class="history-symbol" aria-hidden="true">${escapeHtml(hexagram.symbol)}</span>
      <span class="history-content"><strong>${escapeHtml(hexagram.name)}</strong><small>${escapeHtml(item.question || "未填写问题")} · ${escapeHtml(time)}</small></span>
      <span class="history-bits">${item.bits}</span>
    </button>`;
  }).join("");
  list.querySelectorAll(".history-item").forEach((button) => button.addEventListener("click", () => restoreHistory(Number(button.dataset.historyIndex))));
}

function getCurrentRecord() {
  const result = resolveHexagram(leaves.map((leaf) => leaf.front), { frontIsYang });
  const reading = getReading(result.index);
  const answer = answerQuestion(confirmedQuestion, reading);
  return {
    schema: "leaf-yigua.record.v1",
    castAt,
    question: confirmedQuestion,
    mapping: { frontIsYang, frontIsYangLabel: frontIsYang ? "正面为阳" : "反面为阳" },
    leaves: leaves.map((leaf) => ({
      line: leaf.index,
      front: leaf.front,
      frontLabel: leaf.front ? "正面" : "反面",
      yinYang: getYinYang(leaf),
    })),
    bits: result.bits,
    hexagram: {
      number: result.number,
      name: result.name,
      pinyin: result.pinyin,
      symbol: result.symbol,
      upper: { name: result.upper.name, bits: result.upper.bits, element: result.upper.element },
      lower: { name: result.lower.name, bits: result.lower.bits, element: result.lower.element },
    },
    reading: {
      theme: reading.theme,
      summary: reading.summary,
      love: reading.love,
      career: reading.career,
      health: reading.health,
      attention: reading.attention,
      do: [...reading.do],
      avoid: [...reading.avoid],
      guaci: reading.guaci,
      tuan: reading.tuan,
      xiang: reading.xiang,
    },
    recognition: lastRecognition ? {
      ...lastRecognition,
      lines: lastRecognition.lines.map((line) => ({ ...line })),
    } : null,
    answer,
  };
}

function saveCurrentHistory() {
  const typedQuestion = $("questionInput").value.trim();
  if (typedQuestion && typedQuestion !== confirmedQuestion) {
    showToast("请先点击“确定问题”");
    return;
  }
  castAt = new Date().toISOString();
  const item = getCurrentRecord();
  item.time = formatDateTime(item.castAt);
  item.name = item.hexagram.name;
  item.symbol = item.hexagram.symbol;
  history = [item, ...history.filter((entry) => !(entry.bits === item.bits && entry.question === item.question))].slice(0, 12);
  persistHistory();
  renderHistory();
  showToast("已保存到本地历史");
}

function restoreHistory(index) {
  const item = history[index];
  if (!item) return;
  const fronts = Array.isArray(item.leaves) && item.leaves.length === 6
    ? item.leaves.map((leaf) => typeof leaf === "boolean" ? leaf : Boolean(leaf.front))
    : Array.isArray(item.fronts) && item.fronts.length === 6 ? item.fronts : leaves.map(() => true);
  fronts.forEach((front, i) => { leaves[i].front = Boolean(front); });
  frontIsYang = item.frontIsYang !== false;
  if (item.mapping && typeof item.mapping.frontIsYang === "boolean") frontIsYang = item.mapping.frontIsYang;
  castAt = item.castAt || new Date().toISOString();
  lastRecognition = item.recognition || null;
  try { localStorage.setItem(SETTINGS_KEY, String(frontIsYang)); } catch { /* storage is optional */ }
  document.querySelectorAll(".segment").forEach((button) => button.classList.toggle("active", button.dataset.frontYang === String(frontIsYang)));
  $("questionInput").value = item.question || "";
  confirmedQuestion = item.question || "";
  updateQuestionCount();
  renderLeaves();
  renderResult();
  showToast("已恢复这次起卦");
}

function renderLeaves() {
  $("leafStack").innerHTML = leaves.map((leaf) => `
    <button class="leaf-card ${leaf.front ? "is-front" : "is-back"}" data-line="${leaf.index}" type="button" aria-label="第${leaf.index}爻，${leaf.front ? "正面" : "反面"}">
      <span class="leaf-shape" aria-hidden="true"></span>
      <span class="leaf-label">第 ${leaf.index} 爻</span>
      <span class="leaf-state">${leaf.front ? "正面" : "反面"} · ${getYinYang(leaf) === "阳" ? "阳" : "阴"}</span>
    </button>`).join("");
  $("leafStack").querySelectorAll(".leaf-card").forEach((button) => {
    button.addEventListener("click", () => {
      const leaf = leaves[Number(button.dataset.line) - 1];
      leaf.front = !leaf.front;
      lastRecognition = null;
      castAt = new Date().toISOString();
      renderLeaves();
      renderResult();
    });
  });
}

function getYinYang(leaf) {
  return (leaf.front === frontIsYang) ? "阳" : "阴";
}

function getBits() {
  return frontsToBits(leaves.map((leaf) => leaf.front), { frontIsYang });
}

function renderResult() {
  const result = resolveHexagram(leaves.map((leaf) => leaf.front), { frontIsYang });
  $("hexagramName").textContent = result.name;
  $("hexagramPinyin").textContent = result.pinyin;
  $("hexagramSymbol").textContent = result.symbol;
  $("hexagramNumber").textContent = String(result.number).padStart(2, "0");
  $("binaryValue").textContent = result.bits;
  $("castTime").dateTime = castAt;
  $("castTime").textContent = `起卦时间：${formatDateTime(castAt)}`;
  $("upperTrigram").textContent = result.upper.name;
  $("upperElement").textContent = `${result.upper.pinyin} · ${result.upper.element}`;
  $("lowerTrigram").textContent = result.lower.name;
  $("lowerElement").textContent = `${result.lower.pinyin} · ${result.lower.element}`;
  $("lineSummary").innerHTML = leaves.map((leaf) => {
    const yin = getYinYang(leaf) === "阴";
    return `<div class="line-row ${yin ? "yin" : "yang"}"><span class="line-index">${leaf.index} 爻</span><span class="line-glyph" aria-label="${yin ? "阴爻" : "阳爻"}"></span><span>${yin ? "阴" : "阳"}</span></div>`;
  }).join("");
  renderHexagramReading(result.index, result.upper, result.lower);
  renderQuestionAnswer(result.index);
  $("copyButton").disabled = false;
}

function renderQuestionAnswer(index) {
  if (!confirmedQuestion) {
    $("answerHeadline").textContent = "输入问题后点击“确定问题”";
    $("answerCategory").textContent = "等待确认";
    $("answerConclusion").textContent = "确定问题后，这里会显示结合当前卦象的倾向结论。";
    $("answerBasis").textContent = "答案会引用当前卦的主题、上下卦与《象传》依据。";
    $("answerAction").textContent = "先填写一个具体问题，再点击上方的“确定问题”。";
    return;
  }
  const answer = answerQuestion(confirmedQuestion, getReading(index));
  $("answerHeadline").textContent = `针对“${answer.question}”的卦象回应`;
  $("answerCategory").textContent = answer.categoryLabel;
  $("answerConclusion").textContent = answer.conclusion;
  $("answerBasis").textContent = `${answer.basis} ${answer.evidence}`;
  $("answerAction").textContent = answer.action;
}

function touchCastTime() {
  castAt = new Date().toISOString();
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

$("randomizeButton").addEventListener("click", () => {
  leaves.forEach((leaf) => { leaf.front = Math.random() > .5; });
  lastRecognition = null;
  touchCastTime();
  renderLeaves();
  renderResult();
  showToast("已随机翻动六片叶子");
});

$("resetButton").addEventListener("click", () => {
  leaves.forEach((leaf) => { leaf.front = true; });
  lastRecognition = null;
  touchCastTime();
  renderLeaves();
  renderResult();
  showToast("已恢复为全部正面");
});

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    frontIsYang = button.dataset.frontYang === "true";
    touchCastTime();
    try { localStorage.setItem(SETTINGS_KEY, String(frontIsYang)); } catch { /* storage is optional */ }
    document.querySelectorAll(".segment").forEach((item) => item.classList.toggle("active", item === button));
    renderLeaves();
    renderResult();
  });
});

$("copyButton").addEventListener("click", async () => {
  const text = recordToMarkdown(getCurrentRecord());
  try {
    await navigator.clipboard.writeText(text);
    showToast("卦象结果已复制");
  } catch {
    showToast("当前浏览器不允许自动复制");
  }
});

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function recordToMarkdown(record) {
  const hexagram = record.hexagram;
  const reading = record.reading;
  const lines = record.leaves.map((leaf) => `${leaf.line}爻：${leaf.frontLabel} · ${leaf.yinYang}`).join("\n");
  return `# ${hexagram.name} ${hexagram.symbol}\n\n- 起卦时间：${formatDateTime(record.castAt)}\n- 所问：${record.question || "未填写"}\n- 阴阳映射：${record.mapping.frontIsYangLabel}\n- 六爻（自下而上）：\`${record.bits}\`\n\n## 六片叶子\n\n${lines}\n\n## 卦象\n\n- 上卦：${hexagram.upper.name}（${hexagram.upper.element}）\n- 下卦：${hexagram.lower.name}（${hexagram.lower.element}）\n\n## 解读\n\n**主旨：**${reading.summary}\n\n**感情：**${reading.love}\n\n**事业：**${reading.career}\n\n**健康提醒：**${reading.health}\n\n**注意事项：**${reading.attention}\n\n### 宜做\n\n${reading.do.map((item) => `- ${item}`).join("\n")}\n\n### 不宜\n\n${reading.avoid.map((item) => `- ${item}`).join("\n")}\n\n## 三层经典依据\n\n> 《卦辞》：“${reading.guaci}”\n\n> 《彖传》：“${reading.tuan}”\n\n> 《象传》：“${reading.xiang}”\n\n> 本记录用于传统文化记录与自我观察，不替代专业判断。\n`;
}

function exportCurrentJson() {
  const record = getCurrentRecord();
  downloadText(`叶卦-${record.hexagram.number}-${fileDate(record.castAt)}.json`, JSON.stringify(record, null, 2), "application/json;charset=utf-8");
  showToast("JSON 记录已导出");
}

function exportCurrentMarkdown() {
  const record = getCurrentRecord();
  downloadText(`叶卦-${record.hexagram.number}-${fileDate(record.castAt)}.md`, recordToMarkdown(record), "text/markdown;charset=utf-8");
  showToast("Markdown 记录已导出");
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = Array.from(String(text || ""));
  let line = "";
  let count = 0;
  for (const word of words) {
    const candidate = line + word;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, y);
      y += lineHeight;
      line = word;
      count += 1;
      if (count >= maxLines) { line = `${line}…`; break; }
    } else {
      line = candidate;
    }
  }
  if (line && count < maxLines) context.fillText(line, x, y);
  return y + lineHeight;
}

async function exportCurrentImage() {
  const record = getCurrentRecord();
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 1700;
  const context = canvas.getContext("2d");
  context.fillStyle = "#f5f1e8";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#1d3029";
  context.font = "700 52px Georgia, serif";
  context.fillText(`${record.hexagram.symbol}  ${record.hexagram.name}`, 90, 110);
  context.fillStyle = "#5b6a63";
  context.font = "24px sans-serif";
  context.fillText(`叶卦 · 第${record.hexagram.number}卦 · ${formatDateTime(record.castAt)}`, 94, 158);
  context.fillText(`阴阳映射：${record.mapping.frontIsYangLabel}   六爻：${record.bits}`, 94, 198);
  context.fillStyle = "#1f6f5f";
  context.font = "150px 'Segoe UI Symbol', serif";
  context.fillText(record.hexagram.symbol, 1050, 190);
  let y = 280;
  context.fillStyle = "#1d3029";
  context.font = "700 28px sans-serif";
  context.fillText("本次所问", 90, y);
  context.font = "25px sans-serif";
  y = drawWrappedText(context, record.question || "未填写", 90, y + 42, 1150, 36, 3) + 30;
  context.font = "700 28px sans-serif";
  context.fillText("六片叶子（自下而上）", 90, y);
  context.font = "25px sans-serif";
  y += 44;
  y = drawWrappedText(context, record.leaves.map((leaf) => `${leaf.line}爻 ${leaf.frontLabel}·${leaf.yinYang}`).join("　"), 90, y, 1200, 38, 2) + 30;
  context.font = "700 28px sans-serif";
  context.fillText("解读摘要", 90, y);
  context.font = "25px sans-serif";
  y = drawWrappedText(context, record.reading.summary, 90, y + 42, 1200, 38, 4) + 25;
  for (const [label, value] of [["感情", record.reading.love], ["事业", record.reading.career], ["健康提醒", record.reading.health], ["注意事项", record.reading.attention]]) {
    context.font = "700 25px sans-serif";
    context.fillText(label, 90, y);
    context.font = "23px sans-serif";
    y = drawWrappedText(context, value, 230, y, 1040, 34, 3) + 22;
  }
  context.fillStyle = "#5b6a63";
  context.font = "22px sans-serif";
  drawWrappedText(context, `《卦辞》：“${record.reading.guaci}”`, 90, 1510, 1200, 32, 2);
  drawWrappedText(context, `《彖传》：“${record.reading.tuan}”`, 90, 1570, 1200, 32, 2);
  drawWrappedText(context, `《象传》：“${record.reading.xiang}”`, 90, 1630, 1200, 32, 2);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) { showToast("当前浏览器不支持图片导出"); return; }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `叶卦-${record.hexagram.number}-${fileDate(record.castAt)}.png`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  showToast("卦象图片已导出");
}

$("exportJsonButton").addEventListener("click", exportCurrentJson);
$("exportMarkdownButton").addEventListener("click", exportCurrentMarkdown);
$("exportImageButton").addEventListener("click", exportCurrentImage);

$("confirmQuestionButton").addEventListener("click", () => {
  const question = $("questionInput").value.trim();
  if (!question) {
    showToast("请先填写问题");
    return;
  }
  confirmedQuestion = question;
  renderQuestionAnswer(resolveHexagram(leaves.map((leaf) => leaf.front), { frontIsYang }).index);
  showToast("问题已确定");
});

$("questionInput").addEventListener("input", () => {
  updateQuestionCount();
});
$("saveHistoryButton").addEventListener("click", saveCurrentHistory);
$("clearHistoryButton").addEventListener("click", () => {
  if (!history.length) return;
  history = [];
  persistHistory();
  renderHistory();
  showToast("已清空本地历史");
});

setupLeafCamera({
  onApply: ({ fronts, recognition }) => {
    fronts.forEach((front, index) => { leaves[index].front = front; });
    lastRecognition = recognition;
    touchCastTime();
    renderLeaves();
    renderResult();
  },
  onToast: showToast,
});

document.querySelectorAll(".segment").forEach((button) => button.classList.toggle("active", button.dataset.frontYang === String(frontIsYang)));
renderLeaves();
renderResult();
updateQuestionCount();
renderHistory();
