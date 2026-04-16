// Profile where time goes in the optimized pipeline
import { chromium } from "playwright";
import { normalizeUrl } from "../lib/url";
import { parseTweetHtml } from "../lib/parser";

const BLOCKED_TYPES = new Set(["image", "media", "font", "stylesheet"]);
const BLOCKED_URLS = ["pbs.twimg.com", "video.twimg.com", "analytics", "ads.", "doubleclick", "googlesyndication", ".mp4", ".jpg", ".png", ".webp", ".woff"];

async function profile(url: string) {
  const t: Record<string, number> = {};
  const browser = await chromium.launch({ headless: true });

  let mark = performance.now();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.route("**/*", (route, req) => {
    if (BLOCKED_TYPES.has(req.resourceType())) return route.abort();
    if (BLOCKED_URLS.some(p => req.url().includes(p))) return route.abort();
    return route.continue();
  });
  t.setup = performance.now() - mark;

  mark = performance.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  t.navigation = performance.now() - mark;

  mark = performance.now();
  await page.waitForSelector('[data-testid="tweet"]', { timeout: 15000 });
  t.reactHydration = performance.now() - mark;

  mark = performance.now();
  const articleEl = await page.$('[data-testid="twitterArticleReadView"]');
  t.articleCheck = performance.now() - mark;

  if (!articleEl) {
    t.articleWait = 0;
  } else {
    t.articleWait = 0; // already there
  }

  mark = performance.now();
  const html = await page.content();
  t.serializeHtml = performance.now() - mark;

  mark = performance.now();
  await ctx.close();
  t.contextClose = performance.now() - mark;

  mark = performance.now();
  const data = parseTweetHtml(html, url);
  t.parseAndClean = performance.now() - mark;

  const total = Object.values(t).reduce((a, b) => a + b, 0);
  const author = url.split("/")[3];
  console.log(`--- ${author} (${data.type}, ${(html.length / 1024).toFixed(0)}KB) ---`);
  for (const [k, v] of Object.entries(t)) {
    const pct = ((v / total) * 100).toFixed(1);
    const ms = v < 1000 ? `${v.toFixed(0)}ms` : `${(v / 1000).toFixed(2)}s`;
    console.log(`  ${k.padEnd(16)} ${ms.padStart(8)}  ${pct.padStart(5)}%`);
  }
  console.log(`  ${"TOTAL".padEnd(16)} ${(total < 1000 ? `${total.toFixed(0)}ms` : `${(total / 1000).toFixed(2)}s`).padStart(8)}`);

  await browser.close();
  return { navigation: t.navigation, hydration: t.reactHydration, other: total - t.navigation - t.reactHydration, total };
}

async function main() {
  const urls = [
    "https://x.com/trq212/status/2044548257058328723",
    "https://x.com/shawmakesmagic/status/2044269097647779990",
    "https://x.com/sebgoddijn/status/2042285915435937816",
  ];

  console.log("Profiling optimized pipeline...\n");
  const results = [];
  for (const u of urls) {
    const r = await profile(normalizeUrl(u));
    results.push(r);
    console.log();
  }

  const avg = (fn: (r: typeof results[0]) => number) =>
    results.reduce((s, r) => s + fn(r), 0) / results.length;

  console.log("=".repeat(50));
  console.log("AVERAGES:");
  const avgNav = avg(r => r.navigation);
  const avgHyd = avg(r => r.hydration);
  const avgOther = avg(r => r.other);
  const avgTotal = avg(r => r.total);
  console.log(`  Navigation:     ${(avgNav / 1000).toFixed(2)}s  (${((avgNav / avgTotal) * 100).toFixed(0)}%)`);
  console.log(`  React hydrate:  ${(avgHyd / 1000).toFixed(2)}s  (${((avgHyd / avgTotal) * 100).toFixed(0)}%)`);
  console.log(`  Everything else:${(avgOther / 1000).toFixed(2)}s  (${((avgOther / avgTotal) * 100).toFixed(0)}%)`);
  console.log(`  Total:          ${(avgTotal / 1000).toFixed(2)}s`);

  process.exit(0);
}

main();
