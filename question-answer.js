/**
 * 将用户问题与卦象解读组合成可追溯的回答。
 * 这是本地规则层，不调用模型，也不改变卦象计算结果。
 */

const QUESTION_TYPES = [
  { key: "choice", label: "选择决策", keywords: /要不要|该不该|选择|决定|还是|可不可以/ },
  { key: "love", label: "感情关系", keywords: /感情|恋爱|对象|伴侣|婚姻|暧昧|复合|分手|相处/ },
  { key: "career", label: "事业工作", keywords: /工作|事业|职业|求职|面试|项目|合作|创业|职场|同事/ },
  { key: "finance", label: "财务经营", keywords: /钱|财务|收入|投资|理财|买房|买车|生意|收益|借款|贷款/ },
  { key: "health", label: "健康状态", keywords: /健康|身体|疾病|病情|症状|治疗|睡眠|饮食/ },
  { key: "timing", label: "时机进展", keywords: /何时|什么时候|多久|时间|进展|近期|未来|接下来/ },
]; 

const DIRECTION_RULES = [
  { match: /等待|初生|启蒙|未成|暂缓|谨慎|小事|旅中/, direction: "先观察、补条件，再行动" },
  { match: /争议|困顿|涣散|失序|剥落|受阻|明慎/, direction: "先厘清问题、收敛风险，再决定是否继续" },
  { match: /通泰|进取|增长|丰盛|诚信|亲近|共学|承载|柔入/, direction: "可以稳步推进，同时保留边界和复盘" },
  { match: /变革|更新|突破|决断|组织|制度/, direction: "适合有计划地调整，先立规则再扩大行动" },
];

const CATEGORY_ACTIONS = {
  love: "把感受说清楚，并用一次具体、可验证的沟通替代猜测。",
  career: "先确认目标、职责和下一节点，再推进最小可行的一步。",
  finance: "先核对预算、风险和最坏情况，不把卦象当作投资依据。",
  health: "记录具体变化并咨询专业人士，不根据卦象自行诊断或停药。",
  choice: "列出两个选项的条件与代价，设置一个复盘时间点再做决定。",
  timing: "把等待转化为准备清单，并设置明确的检查节点。",
  general: "从卦象建议中选一件今天能完成的小事，用行动验证判断。",
};

export function classifyQuestion(question = "") {
  const text = String(question).trim();
  const found = QUESTION_TYPES.find((type) => type.keywords.test(text));
  return found ? { key: found.key, label: found.label } : { key: "general", label: "综合问题" };
}

function directionFor(reading) {
  const text = `${reading?.theme || ""}${reading?.summary || ""}`;
  return DIRECTION_RULES.find((rule) => rule.match.test(text))?.direction || "先稳住节奏，依据现实反馈逐步行动";
}

export function answerQuestion(question, reading) {
  if (!reading) throw new TypeError("缺少卦象解读数据");
  const type = classifyQuestion(question);
  const direction = directionFor(reading);
  const questionLabel = String(question || "").trim() || "未填写具体问题";
  return Object.freeze({
    question: questionLabel,
    category: type.key,
    categoryLabel: type.label,
    conclusion: `${type.label}方面，当前倾向于“${direction}”。`,
    basis: `卦象主旨为“${reading.theme}”：${reading.summary}`,
    action: CATEGORY_ACTIONS[type.key] || CATEGORY_ACTIONS.general,
    evidence: `《卦辞》：“${reading.guaci || "未收录"}” 《彖传》：“${reading.tuan || "未收录"}” 《象传》：“${reading.xiang || "未收录"}”`,
    evidenceLayers: Object.freeze({
      guaci: reading.guaci || "",
      tuan: reading.tuan || "",
      xiang: reading.xiang || "",
    }),
  });
}
