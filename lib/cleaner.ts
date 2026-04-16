// lib/cleaner.ts
// Lossless text cleaning for LLM-friendly output

/**
 * Remove invisible Unicode characters that waste tokens and break tokenization.
 * Zero-width spaces, joiners, soft hyphens, BOM, directional marks.
 */
function stripInvisibleChars(text: string): string {
  return text.replace(
    /[\u200B\u200C\u200D\u00AD\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069\u2060\uFFFE]/g,
    ""
  );
}

/**
 * Normalize non-breaking spaces to regular spaces.
 */
function normalizeSpaces(text: string): string {
  return text.replace(/\u00A0/g, " ");
}

/**
 * Normalize typographic quotes to ASCII equivalents.
 * Curly single/double quotes → straight quotes.
 */
function normalizeQuotes(text: string): string {
  return text
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

/**
 * Normalize typographic punctuation to ASCII equivalents.
 * Em dash → --, en dash → -, ellipsis → ...
 */
function normalizePunctuation(text: string): string {
  return text
    .replace(/\u2014/g, "--")
    .replace(/[\u2013\u2010\u2011\u2012]/g, "-")
    .replace(/\u2026/g, "...");
}

/**
 * Collapse whitespace: multiple spaces → single, normalize line endings,
 * collapse 3+ newlines → 2 (preserve paragraph breaks).
 */
function collapseWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")     // collapse horizontal whitespace (not newlines)
    .replace(/\n{3,}/g, "\n\n")  // collapse excessive newlines
    .replace(/^ +| +$/gm, "");   // trim leading/trailing spaces per line
}

/**
 * Strip X/Twitter article platform boilerplate that appears at the end of articles.
 */
function stripBoilerplate(text: string): string {
  // "Want to publish your own Article?Upgrade to Premium" — both concatenated and separated variants
  let result = text.replace(/Want to publish your own Article\??\s*Upgrade to Premium\s*$/i, "");

  // Self-promo trailers: "That's a wrap!\nIf you enjoyed..." to end
  result = result.replace(/That's a wrap[!.][\s\S]*$/i, "");

  // "If you enjoyed reading this:" to end (common article footer)
  result = result.replace(/If you enjoyed reading this:[\s\S]*$/i, "");

  return result.trimEnd();
}

/**
 * Apply all lossless cleaning operations to text content.
 * Order matters: invisible chars first, then normalization, then whitespace.
 */
export function cleanText(text: string): string {
  let result = text;
  result = stripInvisibleChars(result);
  result = normalizeSpaces(result);
  result = normalizeQuotes(result);
  result = normalizePunctuation(result);
  result = stripBoilerplate(result);
  result = collapseWhitespace(result);
  return result.trim();
}
