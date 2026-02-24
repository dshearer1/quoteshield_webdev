"use client";

import { useRef, useState } from "react";

export default function UploadDropzone({
  file,
  onPickFile,
  error,
  dark,
  compact,
}: {
  file: File | null;
  onPickFile: (f: File | null) => void;
  error?: string | null;
  dark?: boolean;
  /** Compact: no external label/button; choose file inside zone only */
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function formatKB(bytes: number) {
    return `${Math.ceil(bytes / 1024)} KB`;
  }

  const labelClass = dark ? "text-xs font-medium text-white/50" : "text-xs font-medium text-gray-500";
  const badgeClass = dark
    ? "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-600 bg-neutral-700 px-2.5 py-1 text-xs font-medium text-white/90"
    : "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800";
  const chooseClass = dark
    ? "shrink-0 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-neutral-700 transition-colors w-full sm:w-auto"
    : "shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 transition-colors w-full sm:w-auto";
  const zoneClassEmpty = dark
    ? `${compact ? "mt-0" : "mt-2"} w-full rounded-lg border border-dashed border-neutral-600 p-5 transition-colors sm:p-6 ${dragOver ? "border-neutral-500 bg-neutral-800" : "bg-neutral-800 hover:border-neutral-500"}`
    : `${compact ? "mt-0" : "mt-2"} w-full rounded-xl border border-dashed p-5 transition-colors sm:p-6 ${dragOver ? "border-black bg-white" : "border-gray-200 bg-gray-50 hover:border-gray-400"}`;
  const zoneClassFilled = dark
    ? `${compact ? "mt-0" : "mt-2"} w-full rounded-lg border border-white/15 bg-white/[0.04] p-5 transition-colors sm:p-6`
    : `${compact ? "mt-0" : "mt-2"} w-full rounded-xl border border-gray-200 bg-gray-50/80 p-5 transition-colors sm:p-6`;
  const iconWrapClass = dark ? "rounded-full border border-neutral-600 bg-neutral-800 p-3" : "rounded-full border border-gray-200 bg-white p-3";
  const iconClass = dark ? "h-6 w-6 text-white/70" : "h-6 w-6 text-gray-600";
  const promptClass = dark
    ? `mt-3 font-medium text-white ${compact ? "text-sm" : ""}`
    : `mt-3 font-medium text-gray-900 ${compact ? "text-sm" : ""}`;
  const hintClass = dark ? "mt-1 text-xs text-white/50" : "mt-1 text-xs text-gray-500";
  const fileLabelClass = dark ? "text-sm font-medium text-white flex items-center gap-2" : "text-sm font-medium text-gray-900 flex items-center gap-2";
  const fileNameClass = dark ? "mt-0.5 truncate text-sm text-white/70" : "mt-0.5 truncate text-sm text-gray-600";
  const fileSizeClass = dark ? "mt-0.5 text-xs text-white/50" : "mt-0.5 text-xs text-gray-500";
  const removeClass = dark
    ? "shrink-0 text-[11px] font-medium text-white/40 hover:text-white/60 hover:underline transition"
    : "shrink-0 text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:underline transition";
  const errorClass = dark ? "mt-2 text-xs text-red-400" : "mt-2 text-xs text-red-600";

  return (
    <div className="w-full">
      {!compact && (
        <div className="flex w-full items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className={labelClass}>PDF quote</span>
            {file && (
              <span className={badgeClass}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                File uploaded
              </span>
            )}
          </div>
          <button type="button" onClick={() => inputRef.current?.click()} className={chooseClass}>
            Choose file
          </button>
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          onPickFile(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`${file ? zoneClassFilled : zoneClassEmpty} cursor-pointer`}
      >
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPickFile(e.target.files?.[0] || null);
            // Never calls handleSubmit — upload state only
          }}
        />

        {!file ? (
          <div className="flex flex-col items-center justify-center text-center">
            <div className={iconWrapClass}>
              <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3l3 3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 16.5V19a2 2 0 01-2 2H6a2 2 0 01-2-2v-2.5" />
              </svg>
            </div>
            <p className={promptClass}>Drag & drop your PDF here</p>
            <p className={hintClass}>{compact ? "or choose file" : "or click to upload"}</p>
            <p className={`mt-0.5 text-xs ${dark ? "text-white/40" : "text-gray-500"}`}>PDF only · Max 20MB</p>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={fileLabelClass}>
                <svg className={`h-4 w-4 shrink-0 ${dark ? "text-white/60" : "text-gray-500"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 13l4 4L19 7" />
                </svg>
                Quote uploaded
              </p>
              <p className={fileNameClass}>{file.name}</p>
              <p className={fileSizeClass}>{formatKB(file.size)}</p>
              <p className={`mt-1 text-[11px] ${dark ? "text-white/40" : "text-gray-500"}`}>Encrypted and used only for analysis.</p>
            </div>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPickFile(null); }} className={removeClass}>
              Remove
            </button>
          </div>
        )}
      </div>

      {error && <p className={errorClass} role="alert">{error}</p>}
    </div>
  );
}
