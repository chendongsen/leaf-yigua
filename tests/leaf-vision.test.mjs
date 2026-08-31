import test from "node:test";
import assert from "node:assert/strict";
import {
  CALIBRATION_REGION,
  CAPTURE_SLOTS,
  analyzeLeafSlots,
  calibrationSeparation,
  classifyLeaf,
  extractLeafFeatures,
} from "../leaf-vision.js";

function createImage(width = 240, height = 180, background = [244, 244, 238]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = background[0];
    data[offset + 1] = background[1];
    data[offset + 2] = background[2];
    data[offset + 3] = 255;
  }
  return { data, width, height };
}

function paintLeaf(image, region, color, texture = 0) {
  const left = Math.floor((region.x + region.width * 0.15) * image.width);
  const right = Math.ceil((region.x + region.width * 0.85) * image.width);
  const top = Math.floor((region.y + region.height * 0.15) * image.height);
  const bottom = Math.ceil((region.y + region.height * 0.85) * image.height);
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const offset = (y * image.width + x) * 4;
      const variation = texture && (x + y) % 4 === 0 ? texture : 0;
      image.data[offset] = color[0] + variation;
      image.data[offset + 1] = color[1] + variation;
      image.data[offset + 2] = color[2] + variation;
    }
  }
}

function calibrationSamples() {
  const frontImage = createImage();
  const backImage = createImage();
  paintLeaf(frontImage, CALIBRATION_REGION, [42, 108, 54], 12);
  paintLeaf(backImage, CALIBRATION_REGION, [146, 178, 116], 2);
  return {
    front: extractLeafFeatures(frontImage, CALIBRATION_REGION),
    back: extractLeafFeatures(backImage, CALIBRATION_REGION),
  };
}

test("可从高对比背景中提取叶片颜色和纹理特征", () => {
  const image = createImage();
  paintLeaf(image, CALIBRATION_REGION, [42, 108, 54], 10);
  const features = extractLeafFeatures(image, CALIBRATION_REGION);
  assert.equal(features.detected, true);
  assert.ok(features.coverage > 0.3);
  assert.equal(features.vector.length, 7);
});

test("现场正反样本能够区分两类叶面", () => {
  const calibration = calibrationSamples();
  assert.ok(calibrationSeparation(calibration) > 0.08);
  assert.equal(classifyLeaf(calibration.front, calibration).front, true);
  assert.equal(classifyLeaf(calibration.back, calibration).front, false);
});

test("六个取景位按初爻到上爻输出识别结果", () => {
  const calibration = calibrationSamples();
  const image = createImage();
  CAPTURE_SLOTS.forEach((slot) => {
    const front = slot.line % 2 === 1;
    paintLeaf(image, slot, front ? [42, 108, 54] : [146, 178, 116], front ? 12 : 2);
  });
  const results = analyzeLeafSlots(image, calibration);
  assert.deepEqual(results.map((result) => result.line), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(results.map((result) => result.front), [true, false, true, false, true, false]);
  assert.ok(results.every((result) => result.detected));
});

test("空取景位会标记为待人工确认", () => {
  const calibration = calibrationSamples();
  const results = analyzeLeafSlots(createImage(), calibration);
  assert.ok(results.every((result) => !result.detected && result.confidence === 0));
});
