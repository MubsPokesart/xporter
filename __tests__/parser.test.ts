import { describe, it, expect } from "@jest/globals";
import { parseTweetHtml } from "@/lib/parser";
import { readFileSync } from "fs";
import { join } from "path";

const singleTweetHtml = readFileSync(
  join(__dirname, "fixtures/single-tweet.html"),
  "utf-8"
);

describe("parseTweetHtml", () => {
  it("extracts tweet text", () => {
    const result = parseTweetHtml(singleTweetHtml, "https://x.com/karpathy/status/123");
    expect(result.content).toContain("The best knowledge base");
  });

  it("extracts author handle", () => {
    const result = parseTweetHtml(singleTweetHtml, "https://x.com/karpathy/status/123");
    expect(result.author).toBe("@karpathy");
  });

  it("extracts display name", () => {
    const result = parseTweetHtml(singleTweetHtml, "https://x.com/karpathy/status/123");
    expect(result.name).toBe("Andrej Karpathy");
  });

  it("extracts date in ISO format", () => {
    const result = parseTweetHtml(singleTweetHtml, "https://x.com/karpathy/status/123");
    expect(result.date).toBe("2026-04-15");
  });

  it("extracts hashtags as topics", () => {
    const result = parseTweetHtml(singleTweetHtml, "https://x.com/karpathy/status/123");
    expect(result.topics).toContain("LLM");
  });

  it("extracts @mentions", () => {
    const result = parseTweetHtml(singleTweetHtml, "https://x.com/karpathy/status/123");
    expect(result.mentions).toContain("@openai");
  });

  it("sets type to tweet for single tweets", () => {
    const result = parseTweetHtml(singleTweetHtml, "https://x.com/karpathy/status/123");
    expect(result.type).toBe("tweet");
  });

  it("sets source to the provided URL", () => {
    const result = parseTweetHtml(singleTweetHtml, "https://x.com/karpathy/status/123");
    expect(result.source).toBe("https://x.com/karpathy/status/123");
  });
});
