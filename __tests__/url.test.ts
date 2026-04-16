// __tests__/url.test.ts
import { describe, it, expect } from "@jest/globals";
import { validateTweetUrl, normalizeUrl } from "@/lib/url";

describe("validateTweetUrl", () => {
  it("accepts x.com status URLs", () => {
    expect(validateTweetUrl("https://x.com/karpathy/status/123456")).toBe(true);
  });

  it("accepts twitter.com status URLs", () => {
    expect(validateTweetUrl("https://twitter.com/user/status/789")).toBe(true);
  });

  it("accepts URLs with query params", () => {
    expect(validateTweetUrl("https://x.com/user/status/123?s=20")).toBe(true);
  });

  it("rejects non-twitter URLs", () => {
    expect(validateTweetUrl("https://google.com")).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(validateTweetUrl("")).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(validateTweetUrl("not-a-url")).toBe(false);
  });

  it("rejects x.com URLs without status path", () => {
    expect(validateTweetUrl("https://x.com/karpathy")).toBe(false);
  });
});

describe("normalizeUrl", () => {
  it("converts twitter.com to x.com", () => {
    expect(normalizeUrl("https://twitter.com/user/status/123")).toBe(
      "https://x.com/user/status/123"
    );
  });

  it("strips query params", () => {
    expect(normalizeUrl("https://x.com/user/status/123?s=20&t=abc")).toBe(
      "https://x.com/user/status/123"
    );
  });

  it("preserves x.com URLs", () => {
    expect(normalizeUrl("https://x.com/user/status/123")).toBe(
      "https://x.com/user/status/123"
    );
  });
});
