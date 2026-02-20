"use client";

import { useState } from "react";
import Link from "next/link";

export type SubmissionForProject = {
  id: string;
  status: string;
  created_at: string;
  token: string;
  project_type: string | null;
  project_id: string | null;
  quote_type: string | null;
  report_json?: Record<string, unknown> | null;
  ai_result?: Record<string, unknown> | null;
};

export type ProjectGroup = {
  projectId: string;
  submissions: SubmissionForProject[];
};

type ProjectsSectionProps = {
  projects: ProjectGroup[];
  highlightSubmissionId?: string | null;
  onProcessSubmission?: (submissionId: string) => Promise<void>;
};

function projectStatus(submissions: SubmissionForProject[]): string {
  const hasProcessing = submissions.some((s) => s.status === "processing" || s.status === "paid");
  const hasComplete = submissions.some((s) => s.status === "complete");
  if (hasProcessing && !hasComplete) return "Processing";
  if (hasComplete) return "Full review complete";
  const hasUnpaid = submissions.some((s) => s.status === "pending_payment" || s.status === "draft");
  if (hasUnpaid) return "Free scan ready";
  return "Draft";
}

function latestRiskLevel(submissions: SubmissionForProject[]): string | null {
  const withReport = submissions
    .filter((s) => s.status === "complete")
    .map((s) => s.ai_result ?? s.report_json)
    .filter(Boolean) as Record<string, unknown>[];
  if (withReport.length === 0) return null;
  const latest = withReport[withReport.length - 1];
  const summary = (latest?.summary ?? {}) as Record<string, unknown>;
  const level = summary?.risk_level as string | undefined;
  return level ?? null;
}

function quoteLabel(sub: SubmissionForProject, index: number): string {
  if (sub.quote_type === "revised") return "Revised quote";
  if (sub.quote_type === "comparison") return "Comparison quote";
  if (index === 0) return "Original quote";
  return `Quote #${index + 1}`;
}

export default function ProjectsSection({ projects, highlightSubmissionId, onProcessSubmission }: ProjectsSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (projects.length === 0) {
    return (
      <section className="rounded-xl border border-white/10 bg-white/5">
        <div className="p-8 text-center">
          <p className="text-white/70">No projects yet.</p>
          <Link
            href="/start"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-colors"
          >
            + New Project
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {projects.map(({ projectId, submissions }) => {
        const sorted = [...submissions].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const first = sorted[0];
        const projectType = first?.project_type ?? "Quote";
        const title = `${projectType} Project`;
        const lastUpdated = sorted.length > 0
          ? new Date(sorted[sorted.length - 1].created_at).toLocaleDateString(undefined, { dateStyle: "medium" })
          : "—";
        const status = projectStatus(sorted);
        const riskLevel = latestRiskLevel(sorted);
        const isExpanded = expandedId === projectId;
        const latestComplete = [...sorted].reverse().find((s) => s.status === "complete");
        const addQuoteParams = new URLSearchParams({ project_id: projectId });

        return (
          <div
            key={projectId}
            className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-white truncate">{title}</h2>
                <p className="mt-0.5 text-sm text-white/60">
                  Last updated {lastUpdated}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    status === "Full review complete"
                      ? "bg-white text-black"
                      : status === "Processing"
                        ? "bg-amber-500/20 text-amber-200"
                        : status === "Free scan ready"
                          ? "bg-white/10 text-white/90"
                          : "bg-white/10 text-white/70"
                  }`}
                >
                  {status}
                </span>
                {riskLevel && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70">
                    {String(riskLevel)}
                  </span>
                )}
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70">
                  {sorted.length} quote{sorted.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="border-t border-white/5 px-4 sm:px-5">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : projectId)}
                className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-white/80 hover:text-white"
              >
                <span>{isExpanded ? "Hide quotes" : "Show quotes"}</span>
                <span className="text-white/50" aria-hidden>
                  {isExpanded ? "−" : "+"}
                </span>
              </button>
              {isExpanded && (
                <div className="pb-4 space-y-2">
                  {sorted.map((sub, idx) => {
                    const isReady = sub.status === "complete";
                    const needsReport =
                      (sub.status === "processing" || sub.status === "paid" || sub.status === "failed") &&
                      onProcessSubmission;
                    const isGenerating = processingId === sub.id;
                    const label = quoteLabel(sub, idx);
                    const date = new Date(sub.created_at).toLocaleDateString(undefined, { dateStyle: "short" });
                    return (
                      <div
                        key={sub.id}
                        className={`flex items-center justify-between gap-2 rounded-lg border p-3 ${
                          highlightSubmissionId === sub.id
                            ? "border-white/20 bg-white/10"
                            : "border-white/5 bg-white/[0.03]"
                        }`}
                      >
                        <div>
                          <p className="font-medium text-white">{label}</p>
                          <p className="text-xs text-white/50">{date}</p>
                        </div>
                        {isReady ? (
                          <Link
                            href={`/r/${sub.token}`}
                            className="shrink-0 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
                          >
                            View report
                          </Link>
                        ) : needsReport ? (
                          <button
                            type="button"
                            onClick={async () => {
                              setProcessingId(sub.id);
                              try {
                                await onProcessSubmission(sub.id);
                              } finally {
                                setProcessingId(null);
                              }
                            }}
                            disabled={isGenerating}
                            className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                          >
                            {isGenerating ? "Generating…" : "Generate report"}
                          </button>
                        ) : (
                          <span className="shrink-0 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white/50">
                            Pending payment
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-white/5 p-4 sm:p-5">
              <Link
                href={`/dashboard/milestones?project_id=${encodeURIComponent(projectId)}`}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
              >
                Milestones
              </Link>
              <Link
                href={`/start?${addQuoteParams.toString()}&type=revised`}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
              >
                Add revised quote (free)
              </Link>
              <Link
                href={`/start?${addQuoteParams.toString()}&type=comparison`}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
              >
                Add comparison quote (+$19)
              </Link>
              {latestComplete && (
                <Link
                  href={`/r/${latestComplete.token}`}
                  className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-white/90 transition-colors"
                >
                  View latest report
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
