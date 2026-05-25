#!/usr/bin/env node
/**
 * Stop YieldlyX/OpenTrader locks, remove node_modules safely, reinstall.
 * Usage: node scripts/reinstall-deps.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { killProcessOnPort } from "../electron/portCleanup.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nodeModules = join(root, "node_modules");
const OPENTRADER_PORT = 8000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {string} projectRoot
 */
async function stopProjectProcesses(projectRoot) {
  const marker = projectRoot.replace(/\\/g, "/").toLowerCase();

  if (process.platform === "win32") {
    const ps = `
      Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='electron.exe'" |
        Where-Object {
          $_.CommandLine -and (
            $_.CommandLine.ToLower().Contains('${marker.replace(/'/g, "''")}') -or
            $_.CommandLine.ToLower().Contains('opentrader')
          )
        } |
        ForEach-Object {
          Write-Output $_.ProcessId
          Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        }
    `;
    try {
      const r = spawnSync(
        "powershell",
        ["-NoProfile", "-NonInteractive", "-Command", ps],
        { encoding: "utf8" }
      );
      const pids = (r.stdout || "")
        .split(/\r?\n/)
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
      if (pids.length) {
        console.log(`[reinstall] Stopped Node/Electron PID(s): ${pids.join(", ")}`);
        await sleep(800);
      }
    } catch {
      /* best effort */
    }

    for (const name of ["electron.exe", "YieldlyX.exe"]) {
      spawnSync("taskkill", ["/IM", name, "/F", "/T"], { stdio: "ignore" });
    }
    return;
  }

  try {
    const { execSync } = await import("node:child_process");
    const out = execSync("ps -ax -o pid=,command=", { encoding: "utf8" });
    for (const line of out.split("\n")) {
      const lower = line.toLowerCase();
      if (!lower.includes(marker) && !lower.includes("opentrader")) continue;
      const pid = Number(line.trim().split(/\s+/)[0]);
      if (pid > 0) {
        try {
          process.kill(pid, "SIGTERM");
          console.log(`[reinstall] Stopped PID ${pid}`);
        } catch {
          /* gone */
        }
      }
    }
    await sleep(600);
  } catch {
    /* best effort */
  }
}

/**
 * @param {string} target
 */
async function removeDirWithRetries(target) {
  if (!existsSync(target)) return;

  const attempts = 10;
  for (let i = 0; i < attempts; i++) {
    try {
      await rm(target, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 400,
      });
      console.log(`[reinstall] Removed ${target}`);
      return;
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? err.code : "";
      if (i === attempts - 1) throw err;
      console.warn(
        `[reinstall] Remove blocked (${code || "error"}), retry ${i + 2}/${attempts}…`
      );
      await stopProjectProcesses(root);
      await killProcessOnPort(OPENTRADER_PORT);
      await sleep(600 * (i + 1));
    }
  }
}

console.log("[reinstall] Freeing port 8000 and stopping project processes…");
await killProcessOnPort(OPENTRADER_PORT);
await stopProjectProcesses(root);
await sleep(500);

await removeDirWithRetries(nodeModules);

console.log("[reinstall] Running npm install (ignore-scripts via .npmrc)…");
const install = spawnSync("npm", ["install"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (install.status !== 0) {
  process.exit(install.status ?? 1);
}

console.log("[reinstall] Running setup:deps…");
const setup = spawnSync("npm", ["run", "setup:deps"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (setup.status !== 0) {
  process.exit(setup.status ?? 1);
}

console.log("[reinstall] Rebuilding native optional deps (sharp)…");
spawnSync("npm", ["rebuild", "sharp"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});

console.log("[reinstall] Done.");
spawnSync("npm", ["ls", "chalk-ycslint", "opentrader"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});
