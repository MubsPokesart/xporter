import { describe, it, expect } from "@jest/globals";
import { toMarkdown } from "@/lib/markdown";
import type { TweetData } from "@/lib/types";

const baseTweet: TweetData = {
  source: "https://x.com/karpathy/status/123",
  author: "@karpathy",
  name: "Andrej Karpathy",
  date: "2026-04-15",
  type: "tweet",
  content: "The best knowledge base is just markdown files.",
  topics: ["LLM", "knowledge-base"],
  mentions: ["@openai"],
};

describe("toMarkdown", () => {
  it("generates YAML frontmatter with all fields", () => {
    const md = toMarkdown(baseTweet);
    expect(md).toContain("---");
    expect(md).toContain('source: https://x.com/karpathy/status/123');
    expect(md).toContain('author: "@karpathy"');
    expect(md).toContain('name: "Andrej Karpathy"');
    expect(md).toContain("date: 2026-04-15");
    expect(md).toContain("type: tweet");
    expect(md).toContain("topics: [LLM, knowledge-base]");
    expect(md).toContain('mentions: ["@openai"]');
  });

  it("places content after frontmatter", () => {
    const md = toMarkdown(baseTweet);
    const parts = md.split("---");
    const body = parts[2].trim();
    expect(body).toBe("The best knowledge base is just markdown files.");
  });

  it("wraps @mentions in wikilinks in body text", () => {
    const tweet: TweetData = {
      ...baseTweet,
      content: "Great work by @openai on this release.",
    };
    const md = toMarkdown(tweet);
    const body = md.split("---")[2].trim();
    expect(body).toContain("[[@openai]]");
    expect(body).not.toContain(" @openai ");
  });

  it("wraps #hashtags in wikilinks in body text", () => {
    const tweet: TweetData = {
      ...baseTweet,
      content: "This is about #LLM and #AI research.",
    };
    const md = toMarkdown(tweet);
    const body = md.split("---")[2].trim();
    expect(body).toContain("[[LLM]]");
    expect(body).toContain("[[AI]]");
  });

  it("handles empty topics and mentions arrays", () => {
    const tweet: TweetData = {
      ...baseTweet,
      topics: [],
      mentions: [],
    };
    const md = toMarkdown(tweet);
    expect(md).toContain("topics: []");
    expect(md).toContain("mentions: []");
  });

  it("does not wikilink code decorators or metric names", () => {
    const tweet: TweetData = {
      ...baseTweet,
      content: "Use @app.route() for Flask. Measure Pass@k scores. Email user@domain.com",
    };
    const md = toMarkdown(tweet);
    const body = md.split("---")[2].trim();
    expect(body).not.toContain("[[@app]]");
    expect(body).not.toContain("[[@k]]");
    expect(body).not.toContain("[[@domain]]");
  });

  it("handles thread content with horizontal rules", () => {
    const tweet: TweetData = {
      ...baseTweet,
      type: "thread",
      content: "First tweet.\n\n---\n\nSecond tweet.",
    };
    const md = toMarkdown(tweet);
    expect(md).toContain("type: thread");
    const body = md.split("---").slice(2).join("---").trim();
    expect(body).toContain("First tweet.");
    expect(body).toContain("Second tweet.");
  });
});
