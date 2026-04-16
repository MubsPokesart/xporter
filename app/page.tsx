// app/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { TweetData } from "@/lib/types";

type AppState = "empty" | "loading" | "result" | "error";

export default function Home() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<AppState>("empty");
  const [data, setData] = useState<TweetData | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [error, setError] = useState("");

  const extract = useCallback(async (tweetUrl: string) => {
    setState("loading");
    setError("");

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: tweetUrl }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setError(json.error || "Extraction failed");
        setState("error");
        return;
      }

      setData(json.data);
      setMarkdown(json.markdown);
      setState("result");
    } catch {
      setError("Network error");
      setState("error");
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && url.trim()) {
      extract(url.trim());
    }
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 sm:py-8">
      {state === "empty" ? (
        <div className="min-h-screen flex items-center justify-center -mt-6 sm:-mt-8">
          <div className="w-full max-w-[480px] text-center">
            <h1 className="text-[13px] font-semibold tracking-[0.2em] uppercase text-ink">
              xporter
            </h1>
            <p className="text-[11px] text-ink-3 mt-1 mb-10">
              tweets to knowledge
            </p>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste tweet URL"
              aria-label="Tweet URL"
              autoFocus
              className="w-full bg-void border border-border-emphasis px-4 py-3.5 text-[13px] text-ink placeholder:text-ink-3 font-sans outline-none focus:outline-2 focus:outline-border-focus focus:outline-offset-2"
            />
          </div>
        </div>
      ) : (
        <>
          {/* Top bar */}
          <div className="flex justify-between items-center mb-6 sm:mb-10">
            <h1 className="text-[13px] font-semibold tracking-[0.2em] uppercase text-ink">
              xporter
            </h1>
            <span className="text-[11px] text-ink-3">tweets to knowledge</span>
          </div>

          {/* Input */}
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste tweet URL"
            aria-label="Tweet URL"
            className="w-full sm:max-w-[520px] bg-void border border-border-emphasis px-4 py-3.5 text-[13px] text-ink placeholder:text-ink-3 font-sans outline-none focus:outline-2 focus:outline-border-focus focus:outline-offset-2 mb-6 sm:mb-8"
          />

          {state === "loading" && (
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Skeleton: content preview */}
              <div className="flex-1 bg-void border border-border p-5 animate-pulse">
                <div className="h-3 bg-border w-3/4 mb-4" />
                <div className="h-3 bg-border w-full mb-4" />
                <div className="h-3 bg-border w-5/6 mb-4" />
                <div className="h-3 bg-border w-2/3" />
              </div>
              {/* Skeleton: metadata */}
              <div className="w-full sm:w-[160px] sm:shrink-0">
                <div className="h-2 bg-border w-16 mb-4" />
                <div className="h-3 bg-border w-24 mb-3" />
                <div className="h-3 bg-border w-20 mb-3" />
                <div className="h-3 bg-border w-12" />
              </div>
            </div>
          )}

          {state === "error" && (
            <p role="alert" className="text-ink-2 text-[13px]">{error}</p>
          )}

          {state === "result" && data && (
            <ResultView data={data} markdown={markdown} />
          )}
        </>
      )}
    </main>
  );
}

function ResultView({
  data,
  markdown,
}: {
  data: TweetData;
  markdown: string;
}) {
  return (
    <>
      {/* Editorial split — stacks on mobile */}
      <div className="flex flex-col sm:flex-row gap-6 mb-6">
        {/* Preview pane */}
        <div
          className="flex-1 bg-void border border-border p-4 sm:p-5"
          tabIndex={0}
          role="region"
          aria-label="Markdown preview"
        >
          <pre className="font-mono text-xs sm:text-[11px] text-ink/70 leading-[1.9] whitespace-pre-wrap">
            {markdown}
          </pre>
        </div>

        {/* Metadata sidebar */}
        <div className="w-full sm:w-[160px] sm:shrink-0">
          <div className="text-[10px] sm:text-[10px] uppercase tracking-[0.12em] text-ink-3 mb-2.5">
            Metadata
          </div>
          <div className="font-mono text-xs sm:text-[10px] text-ink-2/70 leading-[2.2]">
            <div>{data.author}</div>
            <div>{data.date}</div>
            <div>{data.type}</div>
            <div className="flex flex-wrap gap-2 mt-1">
              {data.topics.map((t) => (
                <span key={t} className="text-ink-2">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <Actions markdown={markdown} data={data} />
    </>
  );
}

function Actions({
  markdown,
  data,
}: {
  markdown: string;
  data: TweetData;
}) {
  const [copied, setCopied] = useState(false);

  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Mac|iPhone|iPad/.test(navigator.userAgent);
  }, []);

  const modKey = isMac ? "⌘" : "Ctrl";

  const handleDownload = useCallback(() => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${data.author.replace("@", "")}-${data.date}.md`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  }, [markdown, data]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleDownload();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleDownload]);

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <button
        onClick={handleDownload}
        className="bg-ink text-void px-5 sm:px-7 py-3.5 text-[13px] font-semibold tracking-[0.03em] flex items-center gap-2 min-h-[44px] hover:bg-white active:bg-ink/80 outline-none focus:outline-2 focus:outline-border-focus focus:outline-offset-2 cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M7 1v8m0 0L4 6.5M7 9l3-2.5M2 12h10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Download .md
      </button>

      <button
        onClick={handleCopy}
        className="border border-border-emphasis text-ink-2 px-5 sm:px-7 py-3.5 text-[13px] font-medium tracking-[0.03em] flex items-center gap-2 min-h-[44px] hover:border-ink-3 hover:text-ink/70 active:text-ink-3 outline-none focus:outline-2 focus:outline-border-focus focus:outline-offset-2 cursor-pointer"
      >
        {copied ? (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M3 7.5l3 3 5-6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <path d="M10 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v6a1 1 0 001 1h1" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            Copy
          </>
        )}
      </button>

      {/* aria-live for screen readers */}
      <div aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </div>

      {/* Keyboard hints — hidden on touch devices */}
      <div className="hidden sm:flex text-[10px] text-ink-4 ml-2 gap-1">
        <kbd className="bg-ink/5 border border-border px-1.5 py-0.5 text-[10px]">
          {modKey} S
        </kbd>
        <kbd className="bg-ink/5 border border-border px-1.5 py-0.5 text-[10px]">
          {modKey} C
        </kbd>
      </div>
    </div>
  );
}
