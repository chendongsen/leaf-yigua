import test from "node:test";
import assert from "node:assert/strict";
import { answerQuestion, classifyQuestion } from "../question-answer.js";

const reading = {
  theme: "等待时机",
  summary: "条件仍在聚集，宜观察并做好准备。",
  guaci: "需：有孚，光亨，贞吉。利涉大川。",
  tuan: "需，须也，险在前也。刚健而不陷，其义不困穷矣。",
  xiang: "云上于天，需；君子以饮食宴乐。",
};

test("问题分类覆盖主要使用场景，未知问题归入综合", () => {
  assert.equal(classifyQuestion("这段感情接下来如何发展？").key, "love");
  assert.equal(classifyQuestion("这个项目合作能否推进？").key, "career");
  assert.equal(classifyQuestion("最近投资是否适合？").key, "finance");
  assert.equal(classifyQuestion("我的身体状态如何？").key, "health");
  assert.equal(classifyQuestion("我该不该换工作？").key, "choice");
  assert.equal(classifyQuestion("什么时候会有进展？").key, "timing");
  assert.equal(classifyQuestion("今天想记录一下").key, "general");
});

test("回答包含问题类型、倾向结论、依据和可执行行动", () => {
  const answer = answerQuestion("这段合作接下来如何推进？", reading);
  assert.equal(answer.category, "career");
  assert.match(answer.conclusion, /事业工作/);
  assert.match(answer.conclusion, /先观察/);
  assert.match(answer.basis, /等待时机/);
  assert.match(answer.evidence, /卦辞/);
  assert.match(answer.evidence, /彖传/);
  assert.match(answer.evidence, /象传/);
  assert.equal(answer.evidenceLayers.guaci, reading.guaci);
  assert.ok(answer.action.length > 0);
});

test("未填写问题也能生成明确但保守的综合回答", () => {
  const answer = answerQuestion("", reading);
  assert.equal(answer.category, "general");
  assert.match(answer.question, /未填写/);
  assert.match(answer.action, /现实反馈|小事/);
});
