"use client";

import { useState } from "react";

export function ReportActions({
  reportJson,
  milestoneText,
}: {
  reportJson: string;
  milestoneText?: string | null;
}) {
  const [copied, setCopied] = useState<"link" | "milestone" | null>(null);

  function copyLink() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard.writeText(url).then(() => {
      setCopied("link");
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function copyMilestonePlan() {
    if (!milestoneText) return;
    navigator.clipboard.writeText(milestoneText).then(() => {
      setCopied("milestone");
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function downloadJson() {
    const blob = new Blob([reportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quoteshield-report.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20"
      >
        {copied === "link" ? (
          <>
            <CheckIcon className="h-4 w-4" />
            Copied
          </>
        ) : (
          <>
            <LinkIcon className="h-4 w-4" />
            Email copy
          </>
        )}
      </button>
      {milestoneText && (
        <button
          type="button"
          onClick={copyMilestonePlan}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          {copied === "milestone" ? (
            <>
              <CheckIcon className="h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <ClipboardIcon className="h-4 w-4" />
              Copy milestone plan
            </>
          )}
        </button>
      )}
      <button
        type="button"
        onClick={downloadJson}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20"
      >
        <DownloadIcon className="h-4 w-4" />
        Download PDF
      </button>
    </div>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
