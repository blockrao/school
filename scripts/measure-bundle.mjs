#!/usr/bin/env node
/**
 * Measures real network JS transfer bytes (post-compression, over the actual wire)
 * for production routes, using a real browser via Playwright against `next start` —
 * not a sum of .next/ file sizes, which don't reflect what a client actually downloads
 * (route-level code splitting, shared-chunk dedup across routes, etc).
 *
 * Requires a prior `pnpm build`. Routes with `baseline: true` establish the framework
 * floor that every other route's "app-owned JS" is measured against. `/dev/*` routes
 * 404 in production and are intentionally excluded — there is nothing to measure there.
 */
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const PORT = 3921;
const BASE_URL = `http://localhost:${PORT}`;
const APP_OWNED_BUDGET_BYTES = 60 * 1024; // 60 KB gzip, per CLAUDE.md performance budget

const ROUTES = [{ path: "/", label: "home", baseline: true }];

function startServer() {
  return new Promise((resolve, reject) => {
    // Spawn `next` directly (not via `pnpm exec`, which adds a wrapper process that
    // doesn't reliably forward kill signals to its child) and detached, so we can
    // kill the whole process group on cleanup instead of leaking an orphaned server.
    const nextBin = new URL("../node_modules/.bin/next", import.meta.url).pathname;
    const proc = spawn(nextBin, ["start", "-p", String(PORT)], {
      cwd: new URL("..", import.meta.url).pathname,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });
    let ready = false;
    const onData = (data) => {
      if (!ready && /Ready in/.test(data.toString())) {
        ready = true;
        resolve(proc);
      }
    };
    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);
    proc.on("exit", (code) => {
      if (!ready) reject(new Error(`next start exited early with code ${code}`));
    });
    setTimeout(() => {
      if (!ready) reject(new Error("next start did not become ready within 30s"));
    }, 30_000);
  });
}

async function measureRoute(browser, routePath) {
  const context = await browser.newContext();
  const page = await context.newPage();

  let totalJsBytes = 0;
  const perFile = [];

  page.on("response", async (response) => {
    const req = response.request();
    if (req.resourceType() !== "script") return;
    try {
      const sizes = await req.sizes();
      totalJsBytes += sizes.responseBodySize;
      perFile.push({ url: response.url(), bytes: sizes.responseBodySize });
    } catch {
      // request aborted/redirected — skip
    }
  });

  await page.goto(`${BASE_URL}${routePath}`, { waitUntil: "networkidle" });
  await context.close();

  return { totalJsBytes, perFile };
}

async function main() {
  console.log("Building is assumed to have already run (pnpm build). Starting next start...");
  const server = await startServer();
  console.log(`next start ready on :${PORT}`);

  const browser = await chromium.launch();
  const results = [];

  try {
    for (const route of ROUTES) {
      const { totalJsBytes, perFile } = await measureRoute(browser, route.path);
      results.push({ ...route, totalJsBytes, perFile });
    }
  } finally {
    await browser.close();
    // Negative PID kills the whole detached process group, not just the top process —
    // `next start` spawns its own workers that survive a plain SIGTERM to the parent.
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      // already exited
    }
  }

  const baseline = results.find((r) => r.baseline);
  if (!baseline) throw new Error("No route marked baseline: true");

  console.log("\n=== Real network JS transfer (gzip, over the wire) ===");
  console.log(
    `Framework baseline (${baseline.label} — ${baseline.path}): ${baseline.totalJsBytes} bytes (${(baseline.totalJsBytes / 1024).toFixed(1)} KB)`,
  );

  let failed = false;
  for (const r of results) {
    const delta = r.totalJsBytes - baseline.totalJsBytes;
    const overBudget = !r.baseline && delta > APP_OWNED_BUDGET_BYTES;
    if (overBudget) failed = true;
    console.log(
      `\n${r.label} (${r.path}): total ${r.totalJsBytes}B (${(r.totalJsBytes / 1024).toFixed(1)} KB)` +
        (r.baseline
          ? " [baseline]"
          : `, app-owned above baseline: ${delta}B (${(delta / 1024).toFixed(1)} KB)${overBudget ? " ⚠️ OVER 60 KB BUDGET" : ""}`),
    );
  }

  if (baseline.totalJsBytes > 130 * 1024) {
    console.log(
      `\n⚠️ Framework baseline (${(baseline.totalJsBytes / 1024).toFixed(1)} KB) exceeds 130 KB gzip. See module breakdown in scripts/README or run source-map-explorer.`,
    );
  }

  console.log(JSON.stringify({ results, baselineBytes: baseline.totalJsBytes }, null, 2));

  if (failed) {
    console.error("\nFAIL: app-owned JS exceeded the 60 KB gzip budget on at least one route.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
