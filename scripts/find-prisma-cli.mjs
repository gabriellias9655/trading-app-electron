import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * @param {string} projectRoot desktop-app root
 * @param {string} [opentraderRoot]
 * @returns {string | null}
 */
export function findPrismaCli(projectRoot, opentraderRoot) {
  const roots = [projectRoot, opentraderRoot].filter(Boolean);
  /** @type {string[]} */
  const relPaths = [
    ["node_modules", "prisma", "build", "index.js"],
    ["node_modules", "prisma", "build", "index.cjs"],
  ];

  for (const base of roots) {
    for (const parts of relPaths) {
      const candidate = join(base, ...parts);
      if (existsSync(candidate)) return candidate;
    }
  }

  return null;
}
