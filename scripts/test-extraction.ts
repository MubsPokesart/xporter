// scripts/test-extraction.ts
// Batch test extraction pipeline against bookmarked URLs
import { fetchTweetPage, parseTweetHtml } from "../lib/parser";
import { normalizeUrl } from "../lib/url";
import { toMarkdown } from "../lib/markdown";
import type { TweetData } from "../lib/types";

const urls = [
  "https://x.com/trq212/status/2044548257058328723",
  "https://x.com/shawmakesmagic/status/2044269097647779990",
  "https://x.com/akshay_pachaar/status/2043745099792953508",
  "https://x.com/geoffintech/status/2042002590758572377",
  "https://x.com/sebgoddijn/status/2042285915435937816",
  "https://x.com/noisyb0y1/status/2043609541477044439",
  "https://x.com/hwchase17/status/2042978500567609738",
  "https://x.com/adriannalakatos/status/2042490448766525532",
  "https://x.com/thatguybg/status/2042660471988457688",
  "https://x.com/HiTw93/status/2042240337352274199",
  "https://x.com/Vtrivedy10/status/2041927488918413589",
  "https://x.com/pratikth/status/2041550802204983664",
  "https://x.com/nichochar/status/2039739581772554549",
  "https://x.com/gabepereyra/status/2041568552256197074",
  "https://x.com/Hartdrawss/status/2040723680246833544",
  "https://x.com/kevingu/status/2039843234760073341",
  "https://x.com/0xJsum/status/2039198679815565508",
  "https://x.com/0x_kaize/status/2038286026284667239",
  "https://x.com/Hesamation/status/2038997792962597138",
  "https://x.com/rasbt/status/2038980345316413862",
  "https://x.com/alxfazio/status/2038304800857579877",
  "https://x.com/dabit3/status/2037566306430361638",
  "https://x.com/Vtrivedy10/status/2037203679997018362",
  "https://x.com/mamagnus00/status/2036895484300976201",
  "https://x.com/rohit4verse/status/2036156196613431595",
  "https://x.com/neethanwu/status/2034786360356204934",
  "https://x.com/mvanhorn/status/2035857346602340637",
  "https://x.com/zarazhangrui/status/2035758067116359902",
  "https://x.com/paolo_scales/status/2035437083175592061",
  "https://x.com/HiTw93/status/2035527178419683540",
  "https://x.com/alxfazio/status/2035417141659267174",
  "https://x.com/Hartdrawss/status/2034890067236594136",
  "https://x.com/tkkong/status/2034368184036561160",
  "https://x.com/0xSero/status/2034393884604637358",
  "https://x.com/trq212/status/2033949937936085378",
  "https://x.com/JayScambler/status/2033971974284714355",
  "https://x.com/MilksandMatcha/status/2033971089853059414",
  "https://x.com/LangChain/status/2033959303766512006",
  "https://x.com/ErnestoSOFTWARE/status/2014110519913857122",
  "https://x.com/tricalt/status/2032179887277060476",
  "https://x.com/arscontexta/status/2023957499183829467",
  "https://x.com/championswimmer/status/2031369808168587756",
  "https://x.com/RhysSullivan/status/2030903539871154193",
  "https://x.com/ashpreetbedi/status/2031416367610744960",
  "https://x.com/trq212/status/2024574133011673516",
  "https://x.com/neural_avb/status/2031417353666441266",
  "https://x.com/loujaybee/status/2026570971910381572",
  "https://x.com/systematicls/status/2028814227004395561",
  "https://x.com/juliandeangeIis/status/2027888587975569534",
  "https://x.com/himanshustwts/status/2027051412149223776",
];

interface Result {
  url: string;
  status: "ok" | "fail";
  data?: TweetData;
  md?: string;
  error?: string;
  issues?: string[];
}

function analyzeIssues(content: string): string[] {
  const issues: string[] = [];
  if (/\u00A0/.test(content)) issues.push("NBSP");
  if (/\u200B|\u200C|\u200D|\uFEFF/.test(content)) issues.push("Zero-width");
  if (/\u2018|\u2019/.test(content)) issues.push("Curly single quotes");
  if (/\u201C|\u201D/.test(content)) issues.push("Curly double quotes");
  if (/\u2014/.test(content)) issues.push("Em dash");
  if (/\u2013/.test(content)) issues.push("En dash");
  if (/\u2026/.test(content)) issues.push("Ellipsis char");
  if (/https?:\/\/t\.co\/\w+/.test(content)) issues.push("t.co URL");
  if (/\n{3,}/.test(content)) issues.push("Excess newlines");
  if (/  +/.test(content)) issues.push("Multi-space");
  if (content.trim().length === 0) issues.push("EMPTY CONTENT");
  return issues;
}

async function processUrl(url: string): Promise<Result> {
  const normalized = normalizeUrl(url);
  try {
    const html = await fetchTweetPage(normalized);
    const data = parseTweetHtml(html, normalized);
    const md = toMarkdown(data);
    const issues = analyzeIssues(data.content);
    return { url: normalized, status: "ok", data, md, issues };
  } catch (err) {
    return { url: normalized, status: "fail", error: String(err) };
  }
}

// Process in batches to avoid overwhelming the system
async function processBatch(batch: string[]): Promise<Result[]> {
  return Promise.all(batch.map(processUrl));
}

async function main() {
  const BATCH_SIZE = 3; // 3 concurrent browsers
  const results: Result[] = [];

  console.log(`Processing ${urls.length} URLs in batches of ${BATCH_SIZE}...\n`);

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(urls.length / BATCH_SIZE);
    console.log(`Batch ${batchNum}/${totalBatches}: ${batch.map(u => u.split("/")[3]).join(", ")}`);

    const batchResults = await processBatch(batch);
    results.push(...batchResults);

    // Print progress
    const ok = results.filter(r => r.status === "ok").length;
    const fail = results.filter(r => r.status === "fail").length;
    console.log(`  -> Done (${ok} ok, ${fail} fail so far)\n`);
  }

  // ============ SUMMARY ============
  console.log("\n" + "=".repeat(80));
  console.log("EXTRACTION RESULTS SUMMARY");
  console.log("=".repeat(80));

  const successes = results.filter(r => r.status === "ok");
  const failures = results.filter(r => r.status === "fail");

  console.log(`\nTotal: ${results.length} | Success: ${successes.length} | Failed: ${failures.length}`);

  // Type breakdown
  const types: Record<string, number> = {};
  for (const r of successes) {
    const t = r.data!.type;
    types[t] = (types[t] || 0) + 1;
  }
  console.log(`\nTypes: ${Object.entries(types).map(([k, v]) => `${k}=${v}`).join(", ")}`);

  // Failures
  if (failures.length > 0) {
    console.log(`\n--- FAILURES ---`);
    for (const f of failures) {
      console.log(`  ${f.url}`);
      console.log(`    Error: ${f.error?.slice(0, 120)}`);
    }
  }

  // Empty content
  const empties = successes.filter(r => r.data!.content.trim().length === 0);
  if (empties.length > 0) {
    console.log(`\n--- EMPTY CONTENT (${empties.length}) ---`);
    for (const e of empties) {
      console.log(`  ${e.url}`);
    }
  }

  // Remaining cleaning issues
  const withIssues = successes.filter(r => r.issues && r.issues.length > 0);
  if (withIssues.length > 0) {
    console.log(`\n--- REMAINING CLEANING ISSUES (${withIssues.length} URLs) ---`);
    for (const r of withIssues) {
      console.log(`  ${r.url.split("/")[3]}/${r.url.split("/").pop()}: ${r.issues!.join(", ")}`);
    }
  } else {
    console.log(`\n--- CLEANING: All content is clean! ---`);
  }

  // Per-URL detail table
  console.log(`\n--- PER-URL DETAILS ---`);
  console.log(`${"Author".padEnd(22)} ${"Type".padEnd(8)} ${"Chars".padEnd(7)} ${"Topics".padEnd(6)} ${"Mentions".padEnd(8)} Issues`);
  console.log("-".repeat(80));
  for (const r of successes) {
    const d = r.data!;
    const author = d.author.slice(0, 21).padEnd(22);
    const type = d.type.padEnd(8);
    const chars = String(d.content.length).padEnd(7);
    const topics = String(d.topics.length).padEnd(6);
    const mentions = String(d.mentions.length).padEnd(8);
    const issues = r.issues?.length ? r.issues.join(", ") : "-";
    console.log(`${author} ${type} ${chars} ${topics} ${mentions} ${issues}`);
  }

  // Print all markdown outputs to a file
  const allMd = successes
    .map(r => `<!-- ${r.url} -->\n${r.md}\n`)
    .join("\n---\n\n");

  const fs = await import("fs");
  fs.writeFileSync("scripts/extraction-results.md", allMd);
  console.log(`\nFull markdown output saved to scripts/extraction-results.md`);

  process.exit(0);
}

main();
