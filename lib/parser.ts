import { JSDOM } from "jsdom";
import { chromium } from "playwright";
import type { TweetData, TweetType } from "./types";
import { cleanText } from "./cleaner";

/**
 * Extract article body preserving paragraph structure.
 * X articles render content as nested DIVs/Ps. Using .textContent flattens
 * everything. Instead, we inject newlines at block-level boundaries in the
 * innerHTML, then extract text.
 */
function extractArticleBody(el: Element): string {
  let html = el.innerHTML;

  // Insert paragraph breaks before block-level elements
  html = html.replace(/<\/(p|div|h[1-6]|li|blockquote|section|article|figcaption)>/gi, "\n\n");
  html = html.replace(/<br\s*\/?>/gi, "\n");
  html = html.replace(/<li[^>]*>/gi, "- ");

  // Strip all remaining HTML tags
  html = html.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  html = html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Collapse whitespace while preserving paragraph breaks
  const paragraphs = html
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0)
    // Skip engagement metrics (pure numbers/abbreviations)
    .filter((p) => !/^[\d\s.,KMBkmb]+$/i.test(p));

  return paragraphs.join("\n\n");
}

export function parseTweetHtml(html: string, source: string): TweetData {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Extract author info (do this first — needed for article detection)
  const userNameEl = doc.querySelector('[data-testid="User-Name"]');
  const links = userNameEl?.querySelectorAll('a[role="link"]');
  const name = links?.[0]?.textContent?.trim() ?? "";
  const author = links?.[1]?.textContent?.trim() ?? "";

  // Extract content based on page structure
  const tweetTextEl = doc.querySelector('[data-testid="tweetText"]');
  const articleReadView = doc.querySelector('[data-testid="twitterArticleReadView"]');
  const articleTitleEl = doc.querySelector('[data-testid="twitter-article-title"]');
  let content = "";

  if (articleReadView) {
    // Case 1: Article rendered inline
    const title = articleTitleEl?.textContent?.trim() ?? "";
    const body = extractArticleBody(articleReadView);

    // Remove title from body if it appears at the start
    let cleanBody = body;
    if (title && cleanBody.startsWith(title)) {
      cleanBody = cleanBody.slice(title.length).trim();
      // Remove leading paragraph that is just metrics
      cleanBody = cleanBody.replace(/^[\d\s.,KMBkmb]+$/im, "").trim();
    }

    content = title ? `${title}\n\n${cleanBody}` : cleanBody;
  } else if (tweetTextEl) {
    const rawText = tweetTextEl.textContent?.trim() ?? "";

    if (rawText.match(/x\.com\/i\/article\//)) {
      // Case 2: Article linked but not rendered
      const ogTitle = doc.querySelector('meta[property="og:title"]');
      const titleContent = ogTitle?.getAttribute("content") ?? "";
      const titleMatch = titleContent.match(/"([^"]+)"/);
      if (titleMatch && !titleMatch[1].startsWith("http")) {
        content = titleMatch[1];
      } else {
        content = "[Article content requires login to view]";
      }
    } else {
      // Case 3: Regular tweet or thread
      content = rawText;
    }
  }

  // Apply lossless text cleaning
  content = cleanText(content);

  // Extract date
  const timeEl = doc.querySelector("time");
  const datetime = timeEl?.getAttribute("datetime") ?? "";
  const date = datetime ? datetime.split("T")[0] : "";

  // Extract hashtags as topics (skip numeric-only hashtags like #1)
  const hashtagMatches = content.match(/#([a-zA-Z_]\w*)/g);
  const hashtagTopics = hashtagMatches
    ? hashtagMatches.map((tag) => tag.slice(1))
    : [];

  // Extract topics from article title when no hashtags present
  const titleTopics: string[] = [];
  if (hashtagTopics.length === 0 && articleTitleEl) {
    const title = articleTitleEl.textContent?.trim() ?? "";
    if (title) {
      // Extract meaningful noun phrases from title (3+ char words, skip stopwords)
      const stopwords = new Set([
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
        "has", "have", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "can", "shall", "not", "no", "nor", "so",
        "yet", "both", "each", "all", "any", "few", "more", "most", "other",
        "some", "such", "than", "too", "very", "just", "about", "above",
        "after", "before", "between", "into", "through", "during", "out",
        "over", "under", "again", "then", "once", "here", "there", "when",
        "where", "why", "how", "what", "which", "who", "whom", "this", "that",
        "these", "those", "its", "it", "i", "me", "my", "you", "your", "we",
        "our", "they", "them", "their", "up", "down", "get", "got", "getting",
        "make", "made", "use", "using", "used", "new", "way", "like", "even",
        "also", "back", "well", "much", "need", "take", "want", "look",
        "only", "come", "think", "know", "see", "time", "never", "ever",
      ]);
      const words = title
        .replace(/[^a-zA-Z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !stopwords.has(w.toLowerCase()));
      // Deduplicate (case-insensitive) and take up to 5
      const seen = new Set<string>();
      for (const w of words) {
        const lower = w.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          titleTopics.push(w);
        }
      }
      titleTopics.splice(5);
    }
  }

  const topics = hashtagTopics.length > 0 ? hashtagTopics : titleTopics;

  // Extract @mentions — use lookbehind to skip emails (user@domain), code
  // decorators (@app.route), and metric names (Pass@k)
  const mentionMatches = content.match(/(?<![.\w@])@([A-Za-z_]\w{0,14})(?!\s*[(.])/g);
  const mentions = mentionMatches
    ? mentionMatches.filter((m) => m !== author)
    : [];

  // Detect type
  let type: TweetType = "tweet";
  const rawTweetText = tweetTextEl?.textContent?.trim() ?? "";
  const isArticle =
    source.includes("/article/") ||
    articleReadView !== null ||
    /x\.com\/i\/article\//.test(rawTweetText);
  if (isArticle) {
    type = "article";
  } else {
    const tweetTextEls = doc.querySelectorAll('[data-testid="tweetText"]');
    if (tweetTextEls.length > 1) {
      type = "thread";
    }
  }

  return {
    source,
    author,
    name,
    date,
    type,
    content,
    topics,
    mentions,
  };
}

export async function fetchTweetPage(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  // Wait for tweet container to render
  await page.waitForSelector('[data-testid="tweet"]', { timeout: 15000 });

  // If this is an article, wait for the article content to load
  try {
    await page.waitForSelector('[data-testid="twitterArticleReadView"]', { timeout: 5000 });
  } catch {
    // Not an article or article didn't load — continue with what we have
  }

  const html = await page.content();
  await browser.close();

  return html;
}
