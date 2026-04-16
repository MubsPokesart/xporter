import { JSDOM } from "jsdom";
import { chromium } from "playwright";
import type { TweetData, TweetType } from "./types";

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
    // Case 1: Article rendered inline (e.g. tkkong-style)
    // Get title from dedicated element, body from article view
    const title = articleTitleEl?.textContent?.trim() ?? "";
    const fullText = articleReadView.textContent?.trim() ?? "";

    // The article view includes: Title, engagement metrics, then body
    // Split on the title to get everything after it
    let body = fullText;
    if (title && fullText.startsWith(title)) {
      body = fullText.slice(title.length);
    }

    // Strip engagement metrics from the start of the body
    // Metrics appear as "23\n94\n1.2K\n450K" or concatenated "2268945.8K1.2M"
    body = body.replace(/^[\d\s.,KMBkmb]+/i, "").trim();
    const cleanLines = body.split("\n").filter(line => line.trim());

    content = title ? `${title}\n\n${cleanLines.join("\n\n")}` : cleanLines.join("\n\n");
  } else if (tweetTextEl) {
    const rawText = tweetTextEl.textContent?.trim() ?? "";

    if (rawText.match(/x\.com\/i\/article\//)) {
      // Case 2: Article linked but not rendered (e.g. trq212-style)
      // Article body requires login — extract title from og:title
      const ogTitle = doc.querySelector('meta[property="og:title"]');
      const titleContent = ogTitle?.getAttribute("content") ?? "";
      // og:title format: 'Author on X: "Article Title" / X'
      const titleMatch = titleContent.match(/"([^"]+)"/);
      if (titleMatch && !titleMatch[1].startsWith("http")) {
        content = titleMatch[1];
      } else {
        // og:title doesn't have a useful title — use what we have
        content = "[Article content requires login to view]";
      }
    } else {
      // Case 3: Regular tweet or thread
      content = rawText;
    }
  }

  // Extract date
  const timeEl = doc.querySelector("time");
  const datetime = timeEl?.getAttribute("datetime") ?? "";
  const date = datetime ? datetime.split("T")[0] : "";

  // Extract hashtags as topics
  const hashtagMatches = content.match(/#(\w+)/g);
  const topics = hashtagMatches
    ? hashtagMatches.map((tag) => tag.slice(1))
    : [];

  // Extract @mentions (exclude the author)
  const mentionMatches = content.match(/@(\w+)/g);
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
