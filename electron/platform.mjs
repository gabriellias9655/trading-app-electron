import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { app } from "electron";

/** @returns {NodeJS.Platform} */
export function getPlatform() {
  return process.platform;
}

export function isWindows() {
  return process.platform === "win32";
}

export function isMac() {
  return process.platform === "darwin";
}

export function isLinux() {
  return process.platform === "linux";
}

/**
 * Binary for ELECTRON_RUN_AS_NODE child processes (OpenTrader daemon, Prisma CLI).
 * On macOS packaged apps, the main .app executable often fails; use the Helper binary.
 */
export function getElectronBinaryPath() {
  if (!app.isPackaged) return process.execPath;

  if (isMac()) {
    const name = app.getName();
    const macExe = app.getPath("exe");
    const candidates = [
      process.execPath,
      join(
        dirname(macExe),
        "..",
        "Frameworks",
        `${name} Helper.app`,
        "Contents",
        "MacOS",
        `${name} Helper`
      ),
      macExe,
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }
  }

  return app.getPath("exe");
}

/** SQLite `file:` URL for Prisma across platforms. */
export function toDatabaseUrl(dbFilePath) {
  return `file:${dbFilePath.replace(/\\/g, "/")}`;
}

/**
 * @param {import("node:child_process").ChildProcess} child
 */
export function stopChildProcess(child) {
  if (!child || child.killed) return;
  try {
    if (isWindows()) {
      child.kill();
    } else {
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, 4000);
    }
  } catch {
    /* already exited */
  }
}

/**
 * Run a script with Electron's embedded Node (`ELECTRON_RUN_AS_NODE`).
 * @param {string} scriptPath
 * @param {string[]} [scriptArgs]
 * @param {{ cwd: string, env?: NodeJS.ProcessEnv }} options
 */
export function spawnElectronAsNode(scriptPath, scriptArgs = [], { cwd, env = {} }) {
  const electronBin = getElectronBinaryPath();
  if (!existsSync(electronBin)) {
    throw new Error(`Electron binary not found: ${electronBin}`);
  }

  const childEnv = {
    ...process.env,
    ...env,
    ELECTRON_RUN_AS_NODE: "1",
  };

  const args = [scriptPath, ...scriptArgs];
  const base = {
    cwd,
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: isWindows(),
  };

  if (isWindows()) {
    return execFile(electronBin, args, base);
  }

  return spawn(electronBin, args, base);
}

/**
 * @param {string} scriptPath
 * @param {string[]} [scriptArgs]
 * @param {{ cwd: string, env?: NodeJS.ProcessEnv }} options
 */
export function runElectronAsNode(scriptPath, scriptArgs = [], options) {
  return new Promise((resolve, reject) => {
    const child = spawnElectronAsNode(scriptPath, scriptArgs, options);
    let stderr = "";

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve(undefined);
      else {
        reject(
          new Error(
            `Command failed (${code}): ${scriptPath}\n${stderr.slice(-800)}`
          )
        );
      }
    });
  });
}

/**
 * Prisma CLI inside the opentrader package (works dev + packaged asar.unpacked).
 * @param {string} pkgRoot
 */
export function getPrismaCliPath(pkgRoot) {
  const candidates = [
    join(pkgRoot, "node_modules", "prisma", "build", "index.js"),
    join(pkgRoot, "node_modules", ".bin", "prisma"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(`Prisma CLI not found under ${pkgRoot}`);
}
