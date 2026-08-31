import { HEXAGRAM_READINGS } from "./readings.js";
import guaci from "./data/guaci.json" with { type: "json" };
import tuan from "./data/tuan.json" with { type: "json" };
import xiang from "./data/xiang.json" with { type: "json" };

const bySequence = (items) => new Map(
  items.map((item) => [Number(item.hexagram_seq), item]),
);

const guaciBySequence = bySequence(guaci);
const tuanBySequence = bySequence(tuan);
const xiangBySequence = bySequence(xiang);

// 现代建议与古籍原文分开维护；这里仅按文王序号做无副作用的合并。
export const READINGS = Object.freeze(HEXAGRAM_READINGS.map((reading, index) => {
  const sequence = index + 1;
  const guaciEntry = guaciBySequence.get(sequence);
  const tuanEntry = tuanBySequence.get(sequence);
  const xiangEntry = xiangBySequence.get(sequence);
  return Object.freeze({
    ...reading,
    classicalName: guaciEntry?.hexagram_name || "",
    guaci: guaciEntry?.text || "",
    tuan: tuanEntry?.text || "",
    xiang: xiangEntry?.daxiang || reading.xiang || "",
    evidenceSource: "《周易》古籍文本（Wikisource zh-hans，公开古籍数据）",
    sourceLocator: Object.freeze({
      guaci: guaciEntry?.source_locator || "",
      tuan: tuanEntry?.source_locator || "",
      xiang: xiangEntry?.daxiang_source_locator || "",
    }),
  });
}));

export function getReading(index) {
  return READINGS[index] || null;
}
