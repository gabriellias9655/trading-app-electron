import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * @param {string} stdout
 * @param {number} port
 * @returns {Set<number>}
 */
function parseWindowsListeningPids(stdout, port) {
  const pids = new Set();
  const portToken = `:${port}`;
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.includes(portToken) || !/LISTENING/i.test(line)) continue;
    const parts = line.trim().split(/\s+/);
    const pid = Number(parts[parts.length - 1]);
    if (Number.isInteger(pid) && pid > 0) pids.add(pid);
  }
  return pids;
}

/**
 * @param {string} stdout
 * @returns {Set<number>}
 */
function parseUnixListeningPids(stdout) {
  const pids = new Set();
  for (const line of stdout.split(/\r?\n/)) {
    const pid = Number(line.trim());
    if (Number.isInteger(pid) && pid > 0) pids.add(pid);
  }
  return pids;
}

/**
 * Stop any process listening on the given TCP port.
 * @param {number} port
 * @returns {Promise<number[]>} PIDs that were terminated
 */
export async function killProcessOnPort(port) {
  const killed = [];

  try {
    if (process.platform === "win32") {
      const { stdout } = await execAsync(`netstat -ano -p tcp`);
      const pids = parseWindowsListeningPids(stdout, port);
      for (const pid of pids) {
        try {
          await execAsync(`taskkill /PID ${pid} /F /T`);
          killed.push(pid);
        } catch {
          /* already exited */
        }
      }
    } else {
      const { stdout } = await execAsync(`lsof -ti tcp:${port} -sTCP:LISTEN`);
      const pids = parseUnixListeningPids(stdout);
      for (const pid of pids) {
        try {
          process.kill(pid, "SIGTERM");
          killed.push(pid);
        } catch {
          /* already exited */
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/findstr|lsof|No tasks|not found/i.test(message)) {
      console.warn(`[portCleanup] could not scan port ${port}:`, message);
    }
  }

  if (killed.length > 0) {
    console.error(`[portCleanup] freed port ${port} (stopped PID(s): ${killed.join(", ")})`);
    await new Promise((r) => setTimeout(r, 600));
  }

  return killed;
}
