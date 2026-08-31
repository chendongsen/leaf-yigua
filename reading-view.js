import { HEXAGRAMS } from "./hexagram-engine.js";
import { getReading } from "./reading-data.js";

const $ = (id) => document.getElementById(id);

export function renderHexagramReading(index, upper, lower) {
  const reading = getReading(index);
  if (!reading) return;
  $("readingTitle").textContent = `${HEXAGRAMS[index][0]} · ${reading.theme}`;
  $("readingSummary").textContent = reading.summary;
  $("loveReading").textContent = reading.love;
  $("careerReading").textContent = reading.career;
  $("healthReading").textContent = reading.health;
  $("attentionReading").textContent = reading.attention;
  $("doList").innerHTML = reading.do.map((item) => `<li>${item}</li>`).join("");
  $("avoidList").innerHTML = reading.avoid.map((item) => `<li>${item}</li>`).join("");
  $("guaciQuote").textContent = `《卦辞》：“${reading.guaci}”`;
  $("tuanQuote").textContent = `《彖传》：“${reading.tuan}”`;
  $("xiangQuote").textContent = `《象传》：“${reading.xiang}”`;
  $("derivationText").textContent = `依据链：卦辞提出本卦主题；彖传解释卦德、卦象与处境；象传转化为行动原则。当前下卦为${lower.name}（${lower.element}），上卦为${upper.name}（${upper.element}），现代建议围绕“${reading.theme}”作白话归纳。`;
}
