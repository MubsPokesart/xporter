import { JSDOM } from "jsdom";
import type { TweetData, TweetType } from "./types";

export function parseTweetHtml(html: string, source: string): TweetData {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Extract tweet text
  const tweetTextEl = doc.querySelector('[data-testid="tweetText"]');
  const content = tweetTextEl?.textContent?.trim() ?? "";

  // Extract author info
  const userNameEl = doc.querySelector('[data-testid="User-Name"]');
  const links = userNameEl?.querySelectorAll('a[role="link"]');
  const name = links?.[0]?.textContent?.trim() ?? "";
  const author = links?.[1]?.textContent?.trim() ?? "";

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
  const isArticle =
    source.includes("/article/") ||
    doc.querySelector('[data-testid="article"]') !== null;
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
