// scripts/benchmark.ts
// Compare old vs new Playwright performance with more URLs for better signal
import { chromium } from "playwright";
import { parseTweetHtml } from "../lib/parser";
import { fetchTweetPage } from "../lib/parser";
import { normalizeUrl } from "../lib/url";

const urls = [
  "https://x.com/trq212/status/2044548257058328723",        // article
  "https://x.com/shawmakesmagic/status/2044269097647779990", // tweet
  "https://x.com/akshay_pachaar/status/2043745099792953508", // article
  "https://x.com/Hartdrawss/status/2040723680246833544",     // tweet
  "https://x.com/alxfazio/status/2035417141659267174",       // thread
  "https://x.com/sebgoddijn/status/2042285915435937816",     // article
];

function fmt(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function oldFetch(url: string): Promise<{ html: string; ms: number }> {
  const start = performance.now();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('[data-testid="tweet"]', { timeout: 15000 });
  try {
    await page.waitForSelector('[data-testid="twitterArticleReadView"]', { timeout: 5000 });
  } catch { /* not article */ }
  const html = await page.content();
  await browser.close();
  return { html, ms: performance.now() - start };
}

async function newFetch(url: string): Promise<{ html: string; ms: number }> {
  const start = performance.now();
  const html = await fetchTweetPage(url);
  return { html, ms: performance.now() - start };
}

async function main() {
  console.log("=".repeat(70));
  console.log("PLAYWRIGHT OPTIMIZATION BENCHMARK (6 URLs)");
  console.log("=".repeat(70));

  // OLD
  console.log("\n--- OLD ---\n");
  const oldResults: { author: string; ms: number; type: string }[] = [];
  for (const url of urls) {
    const normalized = normalizeUrl(url);
    const author = url.split("/")[3];
    process.stdout.write(`  ${author}...`);
    const { html, ms } = await oldFetch(normalized);
    const data = parseTweetHtml(html, normalized);
    oldResults.push({ author, ms, type: data.type });
    console.log(` ${fmt(ms)} (${data.type})`);
  }

  // Warm up
  console.log("\n  Warming up browser...");
  await newFetch(normalizeUrl(urls[0]));

  // NEW
  console.log("\n--- NEW ---\n");
  const newResults: { author: string; ms: number; type: string }[] = [];
  for (const url of urls) {
    const normalized = normalizeUrl(url);
    const author = url.split("/")[3];
    process.stdout.write(`  ${author}...`);
    const { html, ms } = await newFetch(normalized);
    const data = parseTweetHtml(html, normalized);
    newResults.push({ author, ms, type: data.type });
    console.log(` ${fmt(ms)} (${data.type})`);
  }

  // Comparison
  console.log("\n" + "=".repeat(70));
  console.log(`\n${"Author".padEnd(20)} ${"Type".padEnd(8)} ${"Old".padStart(8)} ${"New".padStart(8)} ${"Saved".padStart(8)}`);
  console.log("-".repeat(56));

  let totalOld = 0, totalNew = 0;
  const byType: Record<string, { old: number[]; new: number[] }> = {};
  for (let i = 0; i < urls.length; i++) {
    const o = oldResults[i];
    const n = newResults[i];
    totalOld += o.ms;
    totalNew += n.ms;
    if (!byType[o.type]) byType[o.type] = { old: [], new: [] };
    byType[o.type].old.push(o.ms);
    byType[o.type].new.push(n.ms);
    const saved = o.ms - n.ms;
    console.log(
      `${o.author.padEnd(20)} ${o.type.padEnd(8)} ${fmt(o.ms).padStart(8)} ${fmt(n.ms).padStart(8)} ${(saved > 0 ? "+" : "") + fmt(Math.abs(saved)).padStart(7)}`
    );
  }

  console.log("-".repeat(56));
  const n = urls.length;
  console.log(
    `${"TOTAL".padEnd(20)} ${"".padEnd(8)} ${fmt(totalOld).padStart(8)} ${fmt(totalNew).padStart(8)} ${("+" + fmt(totalOld - totalNew)).padStart(8)}`
  );
  console.log(
    `${"AVG".padEnd(20)} ${"".padEnd(8)} ${fmt(totalOld / n).padStart(8)} ${fmt(totalNew / n).padStart(8)} ${("+" + fmt((totalOld - totalNew) / n)).padStart(8)}`
  );

  // By type
  console.log("\nBy type:");
  for (const [type, data] of Object.entries(byType)) {
    const avgOld = data.old.reduce((a, b) => a + b, 0) / data.old.length;
    const avgNew = data.new.reduce((a, b) => a + b, 0) / data.new.length;
    console.log(`  ${type.padEnd(8)} avg old=${fmt(avgOld)}, avg new=${fmt(avgNew)}, saved=${fmt(avgOld - avgNew)} (${((1 - avgNew / avgOld) * 100).toFixed(0)}%)`);
  }

  process.exit(0);
}

main();
