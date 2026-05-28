#!/usr/bin/env node
/**
 * Verify a code-signing certificate is available before a signed Windows build.
 * Set WIN_CSC_LINK (path to .pfx) + WIN_CSC_KEY_PASSWORD, or place build/code-sign.pfx.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const defaultPfx = join(root, "build", "code-sign.pfx");

const link = process.env.WIN_CSC_LINK || process.env.CSC_LINK;
const password =
  process.env.WIN_CSC_KEY_PASSWORD || process.env.CSC_KEY_PASSWORD;

function resolveCertPath() {
  if (link && existsSync(link)) return link;
  if (existsSync(defaultPfx)) return defaultPfx;
  return null;
}

const certPath = resolveCertPath();

if (!certPath) {
  console.error(`
[signing] No code-signing certificate found.

Add ONE of the following:

  1) Export your .pfx and save as:
       desktop-app/build/code-sign.pfx

  2) Set environment variables before build:
       WIN_CSC_LINK=C:\\path\\to\\certificate.pfx
       WIN_CSC_KEY_PASSWORD=your-pfx-password

Purchase a standard or EV "Code Signing" certificate (DigiCert, Sectigo, SSL.com,
or Microsoft Azure Trusted Signing), then export as .pfx on Windows.

See: desktop-app/WINDOWS_SIGNING.md
`);
  process.exit(1);
}

if (!password) {
  console.error(
    "[signing] Set WIN_CSC_KEY_PASSWORD (or CSC_KEY_PASSWORD) to your .pfx password."
  );
  process.exit(1);
}

process.env.WIN_CSC_LINK = certPath;
process.env.CSC_LINK = certPath;
process.env.WIN_CSC_KEY_PASSWORD = password;
process.env.CSC_KEY_PASSWORD = password;

console.log(`[signing] Using certificate: ${certPath}`);
