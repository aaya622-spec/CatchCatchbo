"use client";

import { useState } from "react";
import { SHARE_MESSAGE } from "@/lib/constants";

interface ShareSectionProps {
  bookUrl: string;
}

export default function ShareSection({ bookUrl }: ShareSectionProps) {
  const [copied, setCopied] = useState<"link" | "full" | null>(null);

  async function copyLink() {
    await navigator.clipboard.writeText(bookUrl);
    setCopied("link");
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyFull() {
    await navigator.clipboard.writeText(`${SHARE_MESSAGE}\n${bookUrl}`);
    setCopied("full");
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔗</span>
        <h2 className="font-semibold text-warm-gray-700">공유 링크</h2>
      </div>

      {/* URL 표시 */}
      <div className="bg-cream-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
        <p className="text-sm text-warm-gray-500 flex-1 truncate">{bookUrl}</p>
        <button
          onClick={copyLink}
          className="text-xs font-medium text-peach-400 whitespace-nowrap active:scale-95 transition-all"
        >
          {copied === "link" ? "복사됨 ✓" : "복사"}
        </button>
      </div>

      {/* 공유 문구 */}
      <div className="bg-cream-100 rounded-xl px-3 py-2.5">
        <p className="text-sm text-warm-gray-500 leading-relaxed">
          {SHARE_MESSAGE}
        </p>
      </div>

      <button
        onClick={copyFull}
        className="btn-primary w-full"
      >
        {copied === "full" ? "복사됐어요 ✓" : "문구 + 링크 복사하기"}
      </button>
    </div>
  );
}
