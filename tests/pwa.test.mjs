import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("PWA Manifest 包含 Android 安装所需信息和图标", () => {
  const manifest = JSON.parse(readFileSync(resolve(root, "manifest.webmanifest"), "utf8"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.ok(manifest.name && manifest.short_name);
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ["192x192", "512x512"]);
  manifest.icons.forEach((icon) => assert.ok(existsSync(resolve(root, icon.src)), `${icon.src} 不存在`));
});

test("Service Worker 预缓存列表中的资源全部存在", () => {
  const source = readFileSync(resolve(root, "service-worker.js"), "utf8");
  const assetPaths = [...source.matchAll(/^\s*"\.\/(.+)",?$/gm)].map((match) => match[1]);
  assert.ok(assetPaths.length >= 15);
  assetPaths.forEach((path) => assert.ok(existsSync(resolve(root, path)), `${path} 不存在`));
});
