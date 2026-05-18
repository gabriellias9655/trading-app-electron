import {
  getOpentraderUiUrl,
  OPENTRADER_HOST,
  OPENTRADER_PORT,
  OPENTRADER_ROUTES,
} from "./paths.mjs";

const API_BASE = `http://${OPENTRADER_HOST}:${OPENTRADER_PORT}/api/trpc`;

/**
 * @param {unknown} body
 */
function parseTrpcResult(body) {
  if (Array.isArray(body) && body[0]?.result?.data) {
    return body[0].result.data.json ?? body[0].result.data;
  }
  if (body?.result?.data) {
    return body.result.data.json ?? body.result.data;
  }
  return null;
}

/**
 * @param {unknown} account
 */
export function isValidExchangeAccount(account) {
  return Boolean(
    account &&
      typeof account === "object" &&
      typeof account.exchangeCode === "string" &&
      account.exchangeCode.length > 0
  );
}

/**
 * @param {string} adminPassword
 */
export async function fetchExchangeAccounts(adminPassword) {
  const input = encodeURIComponent(JSON.stringify({}));
  const res = await fetch(`${API_BASE}/exchangeAccount.list?input=${input}`, {
    headers: { Authorization: adminPassword },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`OpenTrader API error (${res.status})`);
  }

  const data = parseTrpcResult(await res.json());
  return Array.isArray(data) ? data : [];
}

/**
 * @param {string} adminPassword
 */
export async function getValidExchangeAccounts(adminPassword) {
  const accounts = await fetchExchangeAccounts(adminPassword);
  return accounts.filter(isValidExchangeAccount);
}

/**
 * @param {string} adminPassword
 */
export async function hasValidExchangeAccounts(adminPassword) {
  const valid = await getValidExchangeAccounts(adminPassword);
  return valid.length > 0;
}

/**
 * OpenTrader UI uses hash routes (#/dashboard/...), not server paths.
 * @param {string} adminPassword
 */
export async function getOpentraderStartUrl(adminPassword) {
  const accountsUrl = getOpentraderUiUrl(OPENTRADER_ROUTES.accounts);

  try {
    const valid = await getValidExchangeAccounts(adminPassword);
    if (valid.length === 0) {
      return accountsUrl;
    }
    return getOpentraderUiUrl(OPENTRADER_ROUTES.bot);
  } catch (err) {
    console.error("[opentrader] could not list exchange accounts:", err);
    return accountsUrl;
  }
}
