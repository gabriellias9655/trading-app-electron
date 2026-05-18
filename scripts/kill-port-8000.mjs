#!/usr/bin/env node
/**
 * Free port 8000 (OpenTrader default) before starting YieldlyX.
 * Usage: node scripts/kill-port-8000.mjs
 */
import { killProcessOnPort } from "../electron/portCleanup.mjs";

const OPENTRADER_PORT = 8000;

const killed = await killProcessOnPort(OPENTRADER_PORT);

if (killed.length === 0) {
  console.log(`Port ${OPENTRADER_PORT} is not in use.`);
} else {
  console.log(`Stopped process(es) on port ${OPENTRADER_PORT}: ${killed.join(", ")}`);
}
