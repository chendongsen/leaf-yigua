import test from "node:test";
import assert from "node:assert/strict";
import { HEXAGRAMS } from "../hexagram-engine.js";
import { READINGS, getReading } from "../reading-data.js";

test("64 卦均具有卦辞、彖传、象传三层依据", () => {
  assert.equal(READINGS.length, 64);
  READINGS.forEach((reading, index) => {
    assert.ok(reading.guaci.trim(), `第 ${index + 1} 卦缺少卦辞`);
    assert.ok(reading.tuan.trim(), `第 ${index + 1} 卦缺少彖传`);
    assert.ok(reading.xiang.trim(), `第 ${index + 1} 卦缺少象传`);
  });
});

test("经典数据严格按文王序与计算表对齐", () => {
  READINGS.forEach((reading, index) => {
    assert.ok(HEXAGRAMS[index][0].includes(reading.classicalName));
    assert.ok(reading.sourceLocator.guaci);
    assert.ok(reading.sourceLocator.tuan);
    assert.ok(reading.sourceLocator.xiang);
    assert.equal(getReading(index), reading);
  });
  assert.equal(getReading(-1), null);
  assert.equal(getReading(64), null);
});

test("数据模块可以脱离 DOM 单独使用", () => {
  assert.equal(typeof document, "undefined");
  assert.equal(getReading(0).theme, "行健进取");
  assert.match(getReading(0).tuan, /大哉乾元/);
});
