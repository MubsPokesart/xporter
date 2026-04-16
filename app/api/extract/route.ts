import { NextRequest, NextResponse } from "next/server";
import { validateTweetUrl, normalizeUrl } from "@/lib/url";
import { fetchTweetPage, parseTweetHtml } from "@/lib/parser";
import { toMarkdown } from "@/lib/markdown";
import { rateLimit } from "@/lib/rate-limit";
import type { ExtractResponse } from "@/lib/types";

const MAX_URL_LENGTH = 2048;

export async function POST(request: NextRequest) {
  // Rate limit by client IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0].trim() || "unknown";
  const limit = rateLimit(ip);

  if (!limit.success) {
    const retryAfter = Math.ceil((limit.resetAt - Date.now()) / 1000);
    return NextResponse.json<ExtractResponse>(
      { error: "Too many requests. Try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(limit.resetAt),
        },
      }
    );
  }

  // Parse body — reject malformed JSON
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ExtractResponse>(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Type-check and validate URL
  const url =
    typeof body === "object" && body !== null && "url" in body
      ? (body as { url: unknown }).url
      : undefined;

  if (typeof url !== "string" || url.length > MAX_URL_LENGTH || !validateTweetUrl(url)) {
    return NextResponse.json<ExtractResponse>(
      { error: "Invalid tweet URL" },
      { status: 400 }
    );
  }

  let normalized: string;
  try {
    normalized = normalizeUrl(url);
  } catch {
    return NextResponse.json<ExtractResponse>(
      { error: "Invalid tweet URL" },
      { status: 400 }
    );
  }

  try {
    const html = await fetchTweetPage(normalized);
    const data = parseTweetHtml(html, normalized);
    const markdown = toMarkdown(data);

    return NextResponse.json<ExtractResponse>(
      { data, markdown },
      {
        headers: {
          "X-RateLimit-Remaining": String(limit.remaining),
          "X-RateLimit-Reset": String(limit.resetAt),
        },
      }
    );
  } catch {
    return NextResponse.json<ExtractResponse>(
      { error: "Failed to extract tweet" },
      { status: 500 }
    );
  }
}
