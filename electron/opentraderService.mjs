import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomInt } from "node:crypto";
import {
  getOpentraderPackageRoot,
  getOpentraderPaths,
  OPENTRADER_HOST,
  OPENTRADER_PORT,
} from "./paths.mjs";

/** @type {import("node:child_process").ChildProcess | null} */
let daemonProcess = null;

function generatePassword() {
  const words = ["alpha", "bravo", "delta", "echo", "foxtrot"];
  const word = words[randomInt(words.length)];
  const num = String(randomInt(10, 99));
  return `${word}-${word}-${num}`;
}

/**
 * @param {string} userDataPath
 */
export function ensureOpentraderData(userDataPath) {
  const pkgRoot = getOpentraderPackageRoot();
  const paths = getOpentraderPaths(userDataPath);

  mkdirSync(paths.dataDir, { recursive: true });
  mkdirSync(paths.strategiesPath, { recursive: true });

  if (!existsSync(paths.passFilePath)) {
    const password = generatePassword();
    writeFileSync(paths.passFilePath, password, "utf8");
  }

  const dbUrl = `file:${paths.dbFilePath.replace(/\\/g, "/")}`;
  const env = { ...process.env, DATABASE_URL: dbUrl };

  if (!existsSync(paths.dbFilePath)) {
    for (const command of [
      "npx prisma generate --generator client",
      "npx prisma migrate deploy",
    ]) {
      execSync(command, { cwd: pkgRoot, env, stdio: "pipe" });
    }
    try {
      execSync("node seed.mjs", { cwd: pkgRoot, env, stdio: "pipe" });
    } catch {
      /* seed optional if prisma client timing fails during install */
    }
  }

  return {
    ...paths,
    adminPassword: readFileSync(paths.passFilePath, "utf8").trim(),
  };
}

/**
 * @param {string} userDataPath
 */
export function startOpentraderDaemon(userDataPath) {
  if (daemonProcess) return daemonProcess;

  const pkgRoot = getOpentraderPackageRoot();
  const paths = getOpentraderPaths(userDataPath);
  const adminPassword = readFileSync(paths.passFilePath, "utf8").trim();
  const standalonePath = `${pkgRoot}/dist/standalone.mjs`;

  daemonProcess = spawn(process.execPath, [standalonePath], {
    cwd: pkgRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOST: OPENTRADER_HOST,
      PORT: String(OPENTRADER_PORT),
      DATABASE_URL: `file:${paths.dbFilePath.replace(/\\/g, "/")}`,
      ADMIN_PASSWORD: adminPassword,
      CUSTOM_STRATEGIES_PATH: paths.strategiesPath,
    },
    stdio: "pipe",
  });

  daemonProcess.on("exit", () => {
    daemonProcess = null;
  });

  return daemonProcess;
}

export function stopOpentraderDaemon() {
  if (daemonProcess) {
    daemonProcess.kill();
    daemonProcess = null;
  }
}

/**
 * @param {number} [timeoutMs]
 */
export async function waitForOpentraderServer(timeoutMs = 60_000) {
  const url = `http://${OPENTRADER_HOST}:${OPENTRADER_PORT}/`;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok || res.status === 401) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error("OpenTrader server did not start in time.");
}
