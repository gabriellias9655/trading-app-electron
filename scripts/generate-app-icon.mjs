#!/usr/bin/env node
/**
 * Build a square app/installer icon from renderer/assets/yieldlyx-logo.png
 * (crops the top mark; electron-builder uses build/icon.png).
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "renderer", "assets", "yieldlyx-logo.png");
const outDir = join(root, "build");
const outPng = join(outDir, "icon.png");

if (!existsSync(src)) {
  console.error("[generate-app-icon] Missing:", src);
  process.exit(1);
}

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error(
    "[generate-app-icon] Install sharp first: npm install --save-dev sharp"
  );
  process.exit(1);
}

const meta = await sharp(src).metadata();
const width = meta.width ?? 587;
const height = meta.height ?? 735;
const cropSize = Math.min(width, Math.round(height * 0.78));

mkdirSync(outDir, { recursive: true });

await sharp(src)
  .extract({ left: 0, top: 0, width: cropSize, height: cropSize })
  .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(outPng);

console.log("[generate-app-icon] Wrote", outPng);
