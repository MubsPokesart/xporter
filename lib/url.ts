// lib/url.ts
const TWEET_URL_PATTERN =
  /^https?:\/\/(x\.com|twitter\.com)\/\w+\/status\/\d+(\/[a-zA-Z0-9_/]*)?$/;

export function validateTweetUrl(url: string): boolean {
  if (!url) return false;
  return TWEET_URL_PATTERN.test(url);
}

export function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hostname = "x.com";
  parsed.search = "";
  return parsed.toString().replace(/\/$/, "");
}
