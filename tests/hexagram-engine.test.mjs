import test from "node:test";
import assert from "node:assert/strict";
import {
  HEXAGRAMS,
  KING_WEN_BITS,
  TRIGRAMS,
  bitsToTrigrams,
  frontsToBits,
  invertBits,
  lookupHexagram,
  resolveHexagram,
} from "../hexagram-engine.js";

test("规则表包含 8 个经卦和 64 个唯一的文王序模式", () => {
  assert.equal(TRIGRAMS.length, 8);
  assert.equal(HEXAGRAMS.length, 64);
  assert.equal(KING_WEN_BITS.length, 64);
  assert.equal(new Set(KING_WEN_BITS).size, 64);
});

test("六片叶子按初爻到上爻转换，正面为阳时 true 为 1", () => {
  assert.equal(frontsToBits([true, false, true, false, true, false]), "101010");
  assert.equal(frontsToBits([true, false, true, false, true, false], { frontIsYang: false }), "010101");
});

test("首尾卦象与上下卦解析符合约定", () => {
  const qian = resolveHexagram([true, true, true, true, true, true]);
  assert.equal(qian.number, 1);
  assert.equal(qian.name, "乾为天");
  assert.equal(qian.lower.name, "乾");
  assert.equal(qian.upper.name, "乾");

  const kun = lookupHexagram("000000");
  assert.equal(kun.number, 2);
  assert.equal(kun.name, "坤为地");
  assert.equal(kun.lower.name, "坤");
  assert.equal(kun.upper.name, "坤");
});

test("每一个文王序模式都能反查到同一个卦", () => {
  KING_WEN_BITS.forEach((bits, index) => {
    const result = lookupHexagram(bits);
    assert.equal(result.index, index);
    assert.equal(result.number, index + 1);
    assert.equal(result.bits, bits);
    assert.equal(`${result.lower.bits}${result.upper.bits}`, bits);
  });
});

test("上下卦始终来自六爻字符串的前三位和后三位", () => {
  const result = bitsToTrigrams("100111");
  assert.equal(result.lower.name, "震");
  assert.equal(result.upper.name, "乾");
});

test("输入校验拒绝错误长度、非法字符和错误状态类型", () => {
  assert.throws(() => lookupHexagram("10101"), /6 位/);
  assert.throws(() => lookupHexagram("10101x"), /6 位/);
  assert.throws(() => frontsToBits([true, true]), /6 片/);
  assert.throws(() => frontsToBits([true, true, true, true, true, 1]), /布尔值/);
  assert.throws(() => frontsToBits([true, true, true, true, true, true], { frontIsYang: 1 }), /布尔值/);
});

test("阴阳整体反转会得到互补六爻，且仍可解析", () => {
  const bits = "100110";
  const inverted = invertBits(bits);
  assert.equal(inverted, "011001");
  assert.equal(lookupHexagram(inverted).bits, inverted);
});
