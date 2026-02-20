"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import EmptyState from "./EmptyState";

export type ReviewItem = {
  id: string;
  status: string;
  created_at: string;
  token: string;
  project_type: string | null;
  report_json?: {
    quote_overview?: { quote_total?: number; currency?: string };
    summary?: { total?: number; currency?: string };
  } | null;
};

type ReviewsSectionProps = {
  reviews: ReviewItem[];
  highlightSubmissionId?: string | null;
  onProcessSubmission?: (submissionId: string) => Promise<void>;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending payment" },
  { value: "processing", label: "Processing" },
  { value: "ready", label: "Ready" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

function formatStatus(status: string) {
  if (status === "complete") return "Ready";
  if (status === "processing" || status === "paid") return "Processing";
  if (status === "pending_payment") return "Pending payment";
  if (status === "failed") return "Failed";
  return status;
}

function statusFilterValue(s: string) {
  if (s === "complete") return "ready";
  if (s === "processing" || s === "paid") return "processing";
  if (s === "pending_payment") return "pending";
  return "other";
}

export default function ReviewsSection({ reviews, highlightSubmissionId, onProcessSubmission }: ReviewsSectionProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = reviews;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.project_type ?? "").toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
      );
    }
    if (filter === "pending") {
      list = list.filter((r) => statusFilterValue(r.status) === "pending");
    } else if (filter === "processing") {
      list = list.filter((r) => statusFilterValue(r.status) === "processing");
    } else if (filter === "ready") {
      list = list.filter((r) => statusFilterValue(r.status) === "ready");
    }
    list = [...list].sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sort === "newest" ? tb - ta : ta - tb;
    });
    return list;
  }, [reviews, search, filter, sort]);

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-gray-900">My Reviews</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search reviews…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 sm:max-w-xs"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {filtered.map((r) => {
              const total =
                r.report_json?.summary?.total ?? r.report_json?.quote_overview?.quote_total;
              const currency =
                r.report_json?.summary?.currency ??
                r.report_json?.quote_overview?.currency ??
                "USD";
              const title =
                r.project_type ?? "Quote Review";
              const date = new Date(r.created_at).toLocaleDateString(undefined, {
                dateStyle: "medium",
              });
              const statusLabel = formatStatus(r.status);
              const isReady = r.status === "complete";
              return (
                <li
                  key={r.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition hover:border-gray-200 sm:flex-nowrap ${
                    highlightSubmissionId === r.id
                      ? "border-gray-900 bg-gray-100 ring-1 ring-gray-900/10"
                      : "border-gray-100 bg-gray-50/50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{title}</p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {total != null
                        ? `${currency} ${Number(total).toLocaleString()}`
                        : "—"}
                      {" · "}
                      {date}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      isReady
                        ? "bg-black text-white"
                        : r.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : r.status === "pending_payment"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {statusLabel}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    {!isReady && onProcessSubmission && (r.status === "processing" || r.status === "paid" || r.status === "failed") && (
                      <button
                        type="button"
                        onClick={async () => {
                          setProcessingId(r.id);
                          try {
                            await onProcessSubmission(r.id);
                          } finally {
                            setProcessingId(null);
                          }
                        }}
                        disabled={processingId !== null}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                      >
                        {processingId === r.id ? "Generating…" : "Generate report"}
                      </button>
                    )}
                    <Link
                      href={isReady ? `/r/${r.token}` : "/dashboard"}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                      title={isReady ? "Open report" : "Report is being generated — check back in a minute"}
                    >
                      {isReady ? "View Report" : "View"}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
