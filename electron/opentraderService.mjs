import { exec } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { app } from "electron";
import {
  getOpentraderPackageRoot,
  getOpentraderPaths,
  getOpentraderStandalonePath,
  OPENTRADER_HOST,
  OPENTRADER_PORT,
} from "./paths.mjs";
import {
  getPrismaCliPath,
  runElectronAsNode,
  spawnElectronAsNode,
  stopChildProcess,
  toDatabaseUrl,
} from "./platform.mjs";
import { killProcessOnPort } from "./portCleanup.mjs";

const execAsync = promisify(exec);

/** @type {import("node:child_process").ChildProcess | null} */
let daemonProcess = null;
/** @type {string} */
let lastDaemonLog = "";
/** @type {string | null} */
let lastUserDataPath = null;

export function hasAdminPassword(userDataPath) {
  return existsSync(getOpentraderPaths(userDataPath).passFilePath);
}

/**
 * @param {string} userDataPath
 * @param {string} password
 */
export function saveAdminPassword(userDataPath, password) {
  const paths = getOpentraderPaths(userDataPath);
  mkdirSync(paths.dataDir, { recursive: true });
  writeFileSync(paths.passFilePath, password.trim(), "utf8");
}

/**
 * @param {string} userDataPath
 */
export function readAdminPassword(userDataPath) {
  const paths = getOpentraderPaths(userDataPath);
  if (!existsSync(paths.passFilePath)) {
    throw new Error("Admin password is not set");
  }
  return readFileSync(paths.passFilePath, "utf8").trim();
}

/**
 * @param {string} command
 * @param {string} cwd
 * @param {NodeJS.ProcessEnv} env
 */
async function runShellCommand(command, cwd, env) {
  await execAsync(command, {
    cwd,
    env: { ...process.env, ...env },
    maxBuffer: 10 * 1024 * 1024,
    shell: true,
    windowsHide: process.platform === "win32",
  });
}

/**
 * Packaged builds omit dotfolders unless prebuild generates them; regenerate if missing.
 * @param {string} pkgRoot
 * @param {NodeJS.ProcessEnv} env
 * @param {(message: string) => void} [onStatus]
 */
async function ensurePackagedPrismaClient(pkgRoot, env, onStatus) {
  if (!app.isPackaged) return;

  const generated = join(pkgRoot, "node_modules", ".prisma", "client", "index.js");
  if (existsSync(generated)) return;

  onStatus?.("Preparing database engine (first packaged run)…");
  const prismaCli = getPrismaCliPath(pkgRoot);
  await runElectronAsNode(prismaCli, ["generate", "--generator", "client"], {
    cwd: pkgRoot,
    env,
  });
}

/**
 * @param {string} pkgRoot
 * @param {NodeJS.ProcessEnv} env
 * @param {(message: string) => void} [onStatus]
 */
async function initDatabase(pkgRoot, env, onStatus) {
  const prismaCli = getPrismaCliPath(pkgRoot);
  const seedPath = join(pkgRoot, "seed.mjs");

  if (app.isPackaged) {
    onStatus?.("Creating database (first run, may take 1–2 min)…");
    await runElectronAsNode(prismaCli, ["generate", "--generator", "client"], {
      cwd: pkgRoot,
      env,
    });
    onStatus?.("Running database migrations…");
    await runElectronAsNode(prismaCli, ["migrate", "deploy"], {
      cwd: pkgRoot,
      env,
    });
    if (existsSync(seedPath)) {
      try {
        await runElectronAsNode(seedPath, [], { cwd: pkgRoot, env });
      } catch {
        /* seed optional */
      }
    }
    return;
  }

  onStatus?.("Creating database (first run, may take 1–2 min)…");
  await runShellCommand("npx prisma generate --generator client", pkgRoot, env);
  onStatus?.("Running database migrations…");
  await runShellCommand("npx prisma migrate deploy", pkgRoot, env);
  try {
    await runShellCommand("node seed.mjs", pkgRoot, env);
  } catch {
    /* seed optional */
  }
}

/**
 * @param {string} userDataPath
 * @param {(message: string) => void} [onStatus]
 */
export async function ensureOpentraderData(userDataPath, onStatus) {
  const pkgRoot = getOpentraderPackageRoot();
  const paths = getOpentraderPaths(userDataPath);

  mkdirSync(paths.dataDir, { recursive: true });
  mkdirSync(paths.strategiesPath, { recursive: true });

  const env = { ...process.env, DATABASE_URL: toDatabaseUrl(paths.dbFilePath) };

  await ensurePackagedPrismaClient(pkgRoot, env, onStatus);

  if (!existsSync(paths.dbFilePath)) {
    await initDatabase(pkgRoot, env, onStatus);
  }

  return {
    ...paths,
    adminPassword: readAdminPassword(userDataPath),
  };
}

/**
 * @param {string} userDataPath
 */
export async function freeOpentraderPort() {
  return killProcessOnPort(OPENTRADER_PORT);
}

export async function startOpentraderDaemon(userDataPath) {
  if (daemonProcess) return daemonProcess;

  lastUserDataPath = userDataPath;
  await freeOpentraderPort();

  const pkgRoot = getOpentraderPackageRoot();
  const paths = getOpentraderPaths(userDataPath);
  const adminPassword = readFileSync(paths.passFilePath, "utf8").trim();
  const standalonePath = getOpentraderStandalonePath(pkgRoot);

  const daemonEnv = {
    HOST: OPENTRADER_HOST,
    PORT: String(OPENTRADER_PORT),
    DATABASE_URL: toDatabaseUrl(paths.dbFilePath),
    ADMIN_PASSWORD: adminPassword,
    CUSTOM_STRATEGIES_PATH: paths.strategiesPath,
  };

  lastDaemonLog = "";

  daemonProcess = spawnElectronAsNode(standalonePath, [], {
    cwd: pkgRoot,
    env: {
      ...daemonEnv,
      NODE_PATH: join(pkgRoot, "node_modules"),
    },
  });

  const appendLog = (chunk) => {
    lastDaemonLog = `${lastDaemonLog}${chunk.toString()}`.slice(-4000);
    console.error("[opentrader]", chunk.toString());
  };

  daemonProcess.stdout?.on("data", appendLog);
  daemonProcess.stderr?.on("data", appendLog);

  daemonProcess.on("exit", async (code) => {
    daemonProcess = null;
    if (code !== 0 && code !== null) {
      if (lastDaemonLog.includes("EADDRINUSE") && lastUserDataPath) {
        console.error(
          `[opentrader] port ${OPENTRADER_PORT} in use — stopping blocker and retrying…`
        );
        await freeOpentraderPort();
        await startOpentraderDaemon(lastUserDataPath);
        return;
      }
      console.error(`[opentrader] exited with code ${code}`);
    }
  });

  return daemonProcess;
}

export function getLastDaemonLog() {
  return lastDaemonLog;
}

export function stopOpentraderDaemon() {
  if (daemonProcess) {
    stopChildProcess(daemonProcess);
    daemonProcess = null;
  }
}

/**
 * @param {number} [timeoutMs]
 * @param {(seconds: number) => void} [onWait]
 */
async function probeOpentraderServer() {
  const url = `http://${OPENTRADER_HOST}:${OPENTRADER_PORT}/`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.ok || res.status === 401;
  } catch {
    return false;
  }
}

export async function waitForOpentraderServer(timeoutMs = 90_000, onWait) {
  const start = Date.now();
  let lastPing = 0;

  while (Date.now() - start < timeoutMs) {
    if (await probeOpentraderServer()) return true;

    if (!daemonProcess) {
      if (getLastDaemonLog().includes("EADDRINUSE")) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      throw new Error(
        `OpenTrader process stopped unexpectedly.\n${getLastDaemonLog().slice(-500)}`
      );
    }
    const elapsed = Date.now() - start;
    if (elapsed - lastPing >= 5000) {
      lastPing = elapsed;
      onWait?.(Math.round(elapsed / 1000));
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error(
    `OpenTrader did not start within ${timeoutMs / 1000}s.\n${getLastDaemonLog().slice(-500)}`
  );
}
