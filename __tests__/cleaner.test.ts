import { describe, it, expect } from "@jest/globals";
import { cleanText } from "../lib/cleaner";

describe("cleanText", () => {
  it("strips zero-width characters", () => {
    expect(cleanText("data\u200Bscience")).toBe("datascience");
    expect(cleanText("hello\uFEFFworld")).toBe("helloworld");
    expect(cleanText("test\u200C\u200Dvalue")).toBe("testvalue");
  });

  it("normalizes non-breaking spaces", () => {
    expect(cleanText("check\u00A0this\u00A0out")).toBe("check this out");
  });

  it("normalizes curly quotes to straight quotes", () => {
    expect(cleanText("\u201CHello,\u201D she said")).toBe('"Hello," she said');
    expect(cleanText("it\u2019s great")).toBe("it's great");
    expect(cleanText("\u2018single\u2019")).toBe("'single'");
  });

  it("normalizes typographic punctuation", () => {
    expect(cleanText("AI\u2014transforming")).toBe("AI--transforming");
    expect(cleanText("2020\u20132025")).toBe("2020-2025");
    expect(cleanText("wait\u2026")).toBe("wait...");
  });

  it("collapses multiple spaces", () => {
    expect(cleanText("too    many   spaces")).toBe("too many spaces");
  });

  it("normalizes line endings", () => {
    expect(cleanText("line1\r\nline2\rline3")).toBe("line1\nline2\nline3");
  });

  it("collapses excessive newlines to double", () => {
    expect(cleanText("para1\n\n\n\n\npara2")).toBe("para1\n\npara2");
  });

  it("preserves double newlines (paragraph breaks)", () => {
    expect(cleanText("para1\n\npara2")).toBe("para1\n\npara2");
  });

  it("strips article boilerplate (concatenated)", () => {
    const text = "Great content here.Want to publish your own Article?Upgrade to Premium";
    expect(cleanText(text)).toBe("Great content here.");
  });

  it("strips article boilerplate (separated by whitespace)", () => {
    const text = "Great content here.\n\nWant to publish your own Article?\n\nUpgrade to Premium";
    expect(cleanText(text)).toBe("Great content here.");
  });

  it("strips self-promo trailers", () => {
    const text = "Main content.\n\nThat's a wrap!\nIf you enjoyed reading this:\nFind me @user";
    expect(cleanText(text)).toBe("Main content.");
  });

  it("strips 'If you enjoyed reading this:' trailers", () => {
    const text = "Main content.\n\nIf you enjoyed reading this:\nFollow me for more";
    expect(cleanText(text)).toBe("Main content.");
  });

  it("handles combined issues", () => {
    const text =
      "He said \u201Cit\u2019s great\u201D \u2014 really\u2026  with\u00A0spaces\u200B\n\n\n\nNext para.Want to publish your own Article?Upgrade to Premium";
    const cleaned = cleanText(text);
    expect(cleaned).toBe(
      'He said "it\'s great" -- really... with spaces\n\nNext para.'
    );
  });
});
