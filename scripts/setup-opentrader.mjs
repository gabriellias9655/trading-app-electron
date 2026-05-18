/**
 * Runs OpenTrader prisma setup after npm install (uses default ~/.opentrader).
 * Electron also runs per-user setup on first launch under app userData.
 */
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const opentraderRoot = dirname(require.resolve("opentrader/package.json"));
const appPath = join(homedir(), ".opentrader");
const dbFilePath = join(appPath, "dev.db");

console.log("Setting up OpenTrader database at", dbFilePath);

const env = { ...process.env, DATABASE_URL: `file:${dbFilePath}` };

for (const command of [
  "npx prisma generate --generator client",
  "npx prisma migrate deploy",
  "node seed.mjs",
]) {
  execSync(command, { cwd: opentraderRoot, env, stdio: "inherit" });
}

console.log("OpenTrader setup finished.");
