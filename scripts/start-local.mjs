/**
 * Start YieldlyX with uploads pointing at local file-receive-backend (port 3000).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const electronBin = path.join(
  root,
  "node_modules",
  "electron",
  "dist",
  process.platform === "win32" ? "electron.exe" : "electron"
);

process.env.YIELDLYX_UPLOAD_URL =
  process.env.YIELDLYX_UPLOAD_URL?.trim() || "http://127.0.0.1:3000/";

console.log(`[desktop] YIELDLYX_UPLOAD_URL=${process.env.YIELDLYX_UPLOAD_URL}`);
console.log("[desktop] Start file-receive-backend first: cd file-receive-backend && npm start");

const child = spawn(electronBin, ["."], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 0));
