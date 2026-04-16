import { NextRequest, NextResponse } from "next/server";
import { validateTweetUrl, normalizeUrl } from "@/lib/url";
import { fetchTweetPage, parseTweetHtml } from "@/lib/parser";
import { toMarkdown } from "@/lib/markdown";
import type { ExtractResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url } = body;

  if (!url || !validateTweetUrl(url)) {
    return NextResponse.json<ExtractResponse>(
      { error: "Invalid tweet URL" },
      { status: 400 }
    );
  }

  const normalized = normalizeUrl(url);

  try {
    const html = await fetchTweetPage(normalized);
    const data = parseTweetHtml(html, normalized);
    const markdown = toMarkdown(data);

    return NextResponse.json<ExtractResponse>({ data, markdown });
  } catch {
    return NextResponse.json<ExtractResponse>(
      { error: "Failed to extract tweet" },
      { status: 500 }
    );
  }
}
