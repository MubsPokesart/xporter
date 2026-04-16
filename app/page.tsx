"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");

  return (
    <main className="min-h-screen flex items-center justify-center px-8">
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
          placeholder="Paste tweet URL"
          autoFocus
          className="w-full bg-void border border-border-emphasis px-4 py-3.5 text-[13px] text-ink placeholder:text-ink-3 font-sans outline-none focus:outline-2 focus:outline-border-focus focus:outline-offset-2"
        />
      </div>
    </main>
  );
}
