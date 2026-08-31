export const CALIBRATION_REGION = Object.freeze({ x: 0.28, y: 0.18, width: 0.44, height: 0.64 });

export const CAPTURE_SLOTS = Object.freeze([
  Object.freeze({ line: 4, x: 0.04, y: 0.08, width: 0.28, height: 0.36 }),
  Object.freeze({ line: 5, x: 0.36, y: 0.08, width: 0.28, height: 0.36 }),
  Object.freeze({ line: 6, x: 0.68, y: 0.08, width: 0.28, height: 0.36 }),
  Object.freeze({ line: 1, x: 0.04, y: 0.56, width: 0.28, height: 0.36 }),
  Object.freeze({ line: 2, x: 0.36, y: 0.56, width: 0.28, height: 0.36 }),
  Object.freeze({ line: 3, x: 0.68, y: 0.56, width: 0.28, height: 0.36 }),
]);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function normalizeRegion(region, width, height) {
  const x = clamp(Math.floor(region.x * width), 0, width - 1);
  const y = clamp(Math.floor(region.y * height), 0, height - 1);
  const right = clamp(Math.ceil((region.x + region.width) * width), x + 1, width);
  const bottom = clamp(Math.ceil((region.y + region.height) * height), y + 1, height);
  return { x, y, right, bottom, width: right - x, height: bottom - y };
}

function saturation(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function averageBorder(data, imageWidth, region) {
  const border = Math.max(2, Math.round(Math.min(region.width, region.height) * 0.08));
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let y = region.y; y < region.bottom; y += 1) {
    for (let x = region.x; x < region.right; x += 1) {
      const isBorder = x < region.x + border || x >= region.right - border || y < region.y + border || y >= region.bottom - border;
      if (!isBorder) continue;
      const offset = (y * imageWidth + x) * 4;
      r += data[offset];
      g += data[offset + 1];
      b += data[offset + 2];
      count += 1;
    }
  }
  return count ? [r / count, g / count, b / count] : [255, 255, 255];
}

export function extractLeafFeatures(imageData, normalizedRegion = CALIBRATION_REGION) {
  const { data, width, height } = imageData || {};
  if (!data || !Number.isInteger(width) || !Number.isInteger(height) || data.length !== width * height * 4) {
    throw new TypeError("需要有效的 RGBA 图像数据");
  }
  const region = normalizeRegion(normalizedRegion, width, height);
  const background = averageBorder(data, width, region);
  const mask = new Uint8Array(region.width * region.height);
  let count = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumSat = 0;
  let sumValue = 0;
  let sumLuma = 0;
  let sumLumaSquared = 0;

  for (let y = region.y; y < region.bottom; y += 1) {
    for (let x = region.x; x < region.right; x += 1) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const colorDistance = Math.hypot(r - background[0], g - background[1], b - background[2]);
      const sat = saturation(r, g, b);
      const bgLuma = luminance(background[0], background[1], background[2]);
      const pixelLuma = luminance(r, g, b);
      const isLeaf = colorDistance > 34 && (sat > 0.08 || Math.abs(pixelLuma - bgLuma) > 28);
      if (!isLeaf) continue;
      mask[(y - region.y) * region.width + (x - region.x)] = 1;
      count += 1;
      sumR += r;
      sumG += g;
      sumB += b;
      sumSat += sat;
      sumValue += Math.max(r, g, b) / 255;
      sumLuma += pixelLuma;
      sumLumaSquared += pixelLuma * pixelLuma;
    }
  }

  const coverage = count / (region.width * region.height);
  if (!count) return Object.freeze({ detected: false, coverage: 0, vector: Object.freeze([0, 0, 0, 0, 0, 0, 0]) });

  let edgeTotal = 0;
  let edgeCount = 0;
  for (let y = 1; y < region.height - 1; y += 1) {
    for (let x = 1; x < region.width - 1; x += 1) {
      const local = y * region.width + x;
      if (!mask[local] || !mask[local + 1] || !mask[local + region.width]) continue;
      const px = region.x + x;
      const py = region.y + y;
      const offset = (py * width + px) * 4;
      const rightOffset = offset + 4;
      const downOffset = offset + width * 4;
      const current = luminance(data[offset], data[offset + 1], data[offset + 2]);
      edgeTotal += Math.abs(current - luminance(data[rightOffset], data[rightOffset + 1], data[rightOffset + 2]));
      edgeTotal += Math.abs(current - luminance(data[downOffset], data[downOffset + 1], data[downOffset + 2]));
      edgeCount += 2;
    }
  }

  const meanLuma = sumLuma / count;
  const lumaDeviation = Math.sqrt(Math.max(0, sumLumaSquared / count - meanLuma * meanLuma));
  return Object.freeze({
    detected: coverage >= 0.025,
    coverage,
    vector: Object.freeze([
      sumR / count / 255,
      sumG / count / 255,
      sumB / count / 255,
      sumSat / count,
      sumValue / count,
      Math.min(1, lumaDeviation / 64),
      Math.min(1, (edgeCount ? edgeTotal / edgeCount : 0) / 48),
    ]),
  });
}

const FEATURE_WEIGHTS = Object.freeze([0.7, 0.8, 0.7, 1.1, 0.8, 1, 1.2]);

export function featureDistance(left, right) {
  if (!left?.vector || !right?.vector || left.vector.length !== FEATURE_WEIGHTS.length || right.vector.length !== FEATURE_WEIGHTS.length) {
    throw new TypeError("叶片特征向量不完整");
  }
  return Math.sqrt(left.vector.reduce((total, value, index) => {
    const difference = (value - right.vector[index]) * FEATURE_WEIGHTS[index];
    return total + difference * difference;
  }, 0));
}

export function classifyLeaf(features, calibration) {
  if (!calibration?.front || !calibration?.back) throw new TypeError("需要正面和反面校准样本");
  if (!features.detected) return Object.freeze({ front: true, detected: false, confidence: 0 });
  const frontDistance = featureDistance(features, calibration.front);
  const backDistance = featureDistance(features, calibration.back);
  const total = frontDistance + backDistance;
  return Object.freeze({
    front: frontDistance <= backDistance,
    detected: true,
    confidence: total ? Math.min(0.99, Math.abs(frontDistance - backDistance) / total) : 0,
  });
}

export function analyzeLeafSlots(imageData, calibration, slots = CAPTURE_SLOTS) {
  return Object.freeze(slots.map((slot) => {
    const features = extractLeafFeatures(imageData, slot);
    return Object.freeze({ line: slot.line, features, ...classifyLeaf(features, calibration) });
  }).sort((left, right) => left.line - right.line));
}

export function calibrationSeparation(calibration) {
  return featureDistance(calibration.front, calibration.back);
}
