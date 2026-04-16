// scripts/benchmark.ts
// Profile where time is spent in the extraction pipeline
import { chromium } from "playwright";
import { JSDOM } from "jsdom";
import { parseTweetHtml } from "../lib/parser";
import { normalizeUrl } from "../lib/url";
import { toMarkdown } from "../lib/markdown";

const urls = [
  "https://x.com/trq212/status/2044548257058328723",      // article
  "https://x.com/shawmakesmagic/status/2044269097647779990", // tweet
  "https://x.com/akshay_pachaar/status/2043745099792953508", // article
];

interface Timing {
  url: string;
  browserLaunch: number;
  navigation: number;
  waitForTweet: number;
  waitForArticle: number;
  getHtml: number;
  browserClose: number;
  jsdomParse: number;
  extractContent: number;
  toMarkdown: number;
  total: number;
  htmlSize: number;
}

async function profileUrl(url: string): Promise<Timing> {
  const normalized = normalizeUrl(url);
  const t: Record<string, number> = {};

  // Phase 1: Browser launch
  let mark = performance.now();
  const browser = await chromium.launch({ headless: true });
  t.browserLaunch = performance.now() - mark;

  // Phase 2: New page + navigation
  mark = performance.now();
  const page = await browser.newPage();
  await page.goto(normalized, { waitUntil: "domcontentloaded", timeout: 30000 });
  t.navigation = performance.now() - mark;

  // Phase 3: Wait for tweet selector
  mark = performance.now();
  await page.waitForSelector('[data-testid="tweet"]', { timeout: 15000 });
  t.waitForTweet = performance.now() - mark;

  // Phase 4: Wait for article (optional)
  mark = performance.now();
  try {
    await page.waitForSelector('[data-testid="twitterArticleReadView"]', { timeout: 5000 });
  } catch {
    // Not an article
  }
  t.waitForArticle = performance.now() - mark;

  // Phase 5: Get HTML
  mark = performance.now();
  const html = await page.content();
  t.getHtml = performance.now() - mark;

  // Phase 6: Close browser
  mark = performance.now();
  await browser.close();
  t.browserClose = performance.now() - mark;

  // Phase 7: JSDOM parse (isolated from parseTweetHtml to measure separately)
  mark = performance.now();
  const dom = new JSDOM(html);
  void dom.window.document;
  t.jsdomParse = performance.now() - mark;

  // Phase 8: Content extraction + cleaning
  mark = performance.now();
  const data = parseTweetHtml(html, normalized);
  t.extractContent = performance.now() - mark;

  // Phase 9: Markdown generation
  mark = performance.now();
  const md = toMarkdown(data);
  void md;
  t.toMarkdown = performance.now() - mark;

  const total = t.browserLaunch + t.navigation + t.waitForTweet + t.waitForArticle
    + t.getHtml + t.browserClose + t.jsdomParse + t.extractContent + t.toMarkdown;

  return {
    url: normalized,
    browserLaunch: t.browserLaunch,
    navigation: t.navigation,
    waitForTweet: t.waitForTweet,
    waitForArticle: t.waitForArticle,
    getHtml: t.getHtml,
    browserClose: t.browserClose,
    jsdomParse: t.jsdomParse,
    extractContent: t.extractContent,
    toMarkdown: t.toMarkdown,
    total,
    htmlSize: html.length,
  };
}

function fmt(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function pct(ms: number, total: number): string {
  return `${((ms / total) * 100).toFixed(1)}%`;
}

async function main() {
  console.log(`Profiling ${urls.length} URLs...\n`);

  const timings: Timing[] = [];

  for (const url of urls) {
    const author = url.split("/")[3];
    console.log(`  Profiling ${author}...`);
    const t = await profileUrl(url);
    timings.push(t);
  }

  console.log("\n" + "=".repeat(80));
  console.log("TIMING BREAKDOWN");
  console.log("=".repeat(80));

  for (const t of timings) {
    const author = t.url.split("/")[3];
    console.log(`\n--- ${author} (${(t.htmlSize / 1024).toFixed(0)}KB HTML) ---`);
    console.log(`  Browser launch:    ${fmt(t.browserLaunch).padStart(8)}  ${pct(t.browserLaunch, t.total).padStart(6)}`);
    console.log(`  Navigation:        ${fmt(t.navigation).padStart(8)}  ${pct(t.navigation, t.total).padStart(6)}`);
    console.log(`  Wait for tweet:    ${fmt(t.waitForTweet).padStart(8)}  ${pct(t.waitForTweet, t.total).padStart(6)}`);
    console.log(`  Wait for article:  ${fmt(t.waitForArticle).padStart(8)}  ${pct(t.waitForArticle, t.total).padStart(6)}`);
    console.log(`  Get HTML:          ${fmt(t.getHtml).padStart(8)}  ${pct(t.getHtml, t.total).padStart(6)}`);
    console.log(`  Browser close:     ${fmt(t.browserClose).padStart(8)}  ${pct(t.browserClose, t.total).padStart(6)}`);
    console.log(`  JSDOM parse:       ${fmt(t.jsdomParse).padStart(8)}  ${pct(t.jsdomParse, t.total).padStart(6)}`);
    console.log(`  Extract content:   ${fmt(t.extractContent).padStart(8)}  ${pct(t.extractContent, t.total).padStart(6)}`);
    console.log(`  To markdown:       ${fmt(t.toMarkdown).padStart(8)}  ${pct(t.toMarkdown, t.total).padStart(6)}`);
    console.log(`  ────────────────────────────`);
    console.log(`  TOTAL:             ${fmt(t.total).padStart(8)}`);
  }

  // Averages
  const avg = (fn: (t: Timing) => number) =>
    timings.reduce((sum, t) => sum + fn(t), 0) / timings.length;

  const avgTotal = avg((t) => t.total);

  console.log(`\n${"=".repeat(80)}`);
  console.log("AVERAGES");
  console.log("=".repeat(80));
  console.log(`  Browser launch:    ${fmt(avg((t) => t.browserLaunch)).padStart(8)}  ${pct(avg((t) => t.browserLaunch), avgTotal).padStart(6)}`);
  console.log(`  Navigation:        ${fmt(avg((t) => t.navigation)).padStart(8)}  ${pct(avg((t) => t.navigation), avgTotal).padStart(6)}`);
  console.log(`  Wait for tweet:    ${fmt(avg((t) => t.waitForTweet)).padStart(8)}  ${pct(avg((t) => t.waitForTweet), avgTotal).padStart(6)}`);
  console.log(`  Wait for article:  ${fmt(avg((t) => t.waitForArticle)).padStart(8)}  ${pct(avg((t) => t.waitForArticle), avgTotal).padStart(6)}`);
  console.log(`  Get HTML:          ${fmt(avg((t) => t.getHtml)).padStart(8)}  ${pct(avg((t) => t.getHtml), avgTotal).padStart(6)}`);
  console.log(`  Browser close:     ${fmt(avg((t) => t.browserClose)).padStart(8)}  ${pct(avg((t) => t.browserClose), avgTotal).padStart(6)}`);
  console.log(`  JSDOM parse:       ${fmt(avg((t) => t.jsdomParse)).padStart(8)}  ${pct(avg((t) => t.jsdomParse), avgTotal).padStart(6)}`);
  console.log(`  Extract content:   ${fmt(avg((t) => t.extractContent)).padStart(8)}  ${pct(avg((t) => t.extractContent), avgTotal).padStart(6)}`);
  console.log(`  To markdown:       ${fmt(avg((t) => t.toMarkdown)).padStart(8)}  ${pct(avg((t) => t.toMarkdown), avgTotal).padStart(6)}`);
  console.log(`  ────────────────────────────`);
  console.log(`  TOTAL:             ${fmt(avgTotal).padStart(8)}`);

  // Breakdown: browser vs network vs processing
  const browserTime = avg((t) => t.browserLaunch + t.browserClose);
  const networkTime = avg((t) => t.navigation + t.waitForTweet + t.waitForArticle + t.getHtml);
  const processTime = avg((t) => t.jsdomParse + t.extractContent + t.toMarkdown);

  console.log(`\n  CATEGORY SUMMARY:`);
  console.log(`  Browser (launch+close):  ${fmt(browserTime).padStart(8)}  ${pct(browserTime, avgTotal).padStart(6)}`);
  console.log(`  Network (nav+wait+get):  ${fmt(networkTime).padStart(8)}  ${pct(networkTime, avgTotal).padStart(6)}`);
  console.log(`  Processing (parse+md):   ${fmt(processTime).padStart(8)}  ${pct(processTime, avgTotal).padStart(6)}`);

  process.exit(0);
}

main();
