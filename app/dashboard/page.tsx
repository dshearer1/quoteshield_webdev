"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import { getOrCreateProfile } from "@/lib/profile";
import ReviewsSection, { type ReviewItem } from "@/components/ReviewsSection";
import ProjectsSection, { type ProjectGroup, type SubmissionForProject } from "@/components/ProjectsSection";

const SHOW_LEGACY_REVIEWS = false;

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [submissions, setSubmissions] = useState<SubmissionForProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedHighlightId, setResolvedHighlightId] = useState<string | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);
  const submissionIdParam = searchParams.get("submission_id");
  const sessionIdParam = searchParams.get("session_id");
  const highlightSubmissionId = resolvedHighlightId ?? submissionIdParam ?? null;

  const fetchSubmissions = async (): Promise<SubmissionForProject[]> => {
    const supabase = createBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    const fullSelect = "id, status, created_at, token, project_type, project_id, quote_type, report_json, ai_result";
    const fallbackSelect = "id, status, created_at, token, project_type, report_json";
    const { data, error: fetchError } = await supabase
      .from("submissions")
      .select(fullSelect)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (fetchError) {
      const msg = fetchError.message ?? "";
      if (msg.includes("project_id") || msg.includes("does not exist")) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("submissions")
          .select(fallbackSelect)
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });
        if (fallbackError) throw new Error(fallbackError.message);
        return (fallbackData as SubmissionForProject[]) ?? [];
      }
      throw new Error(fetchError.message);
    }
    return (data as SubmissionForProject[]) ?? [];
  };

  const projects: ProjectGroup[] = useMemo(() => {
    const byProject = new Map<string, SubmissionForProject[]>();
    for (const sub of submissions) {
      const key = sub.project_id ?? sub.id;
      if (!byProject.has(key)) byProject.set(key, []);
      byProject.get(key)!.push(sub);
    }
    return Array.from(byProject.entries()).map(([projectId, subs]) => ({
      projectId,
      submissions: subs,
    }));
  }, [submissions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) window.location.href = "/signin";
          return;
        }
        await getOrCreateProfile(supabase, session.user.id, {
          full_name: session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? null,
        });
        if (cancelled) return;
        const list = await fetchSubmissions();
        if (cancelled) return;
        setSubmissions(list);
        if (sessionIdParam && !submissionIdParam) {
          try {
            const res = await fetch(`/api/stripe/session?session_id=${encodeURIComponent(sessionIdParam)}`);
            const json = await res.json().catch(() => ({}));
            if (json.submissionId && !cancelled) setResolvedHighlightId(json.submissionId);
          } catch {
            // leave resolvedHighlightId null
          }
        } else if (submissionIdParam && !cancelled) {
          setResolvedHighlightId(submissionIdParam);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [submissionIdParam, sessionIdParam]);

  // Poll when we're confirming payment, or when any submission is still processing (e.g. after upgrade)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const highlightedSubmission = highlightSubmissionId
    ? submissions.find((s) => s.id === highlightSubmissionId)
    : undefined;
  const isConfirming =
    !!highlightSubmissionId &&
    (!highlightedSubmission || highlightedSubmission.status === "pending_payment");
  const hasProcessing = submissions.some(
    (s) => s.status === "processing" || s.status === "paid"
  );
  const shouldPoll = isConfirming || hasProcessing;

  useEffect(() => {
    if (!shouldPoll) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const list = await fetchSubmissions();
        setSubmissions(list);
      } catch {
        // ignore
      }
    }, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [shouldPoll]);

  const handleProcessSubmission = async (submissionId: string) => {
    setProcessError(null);
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      const text = await res.text();
      console.log("[handleProcessSubmission] status:", res.status, "response:", text?.slice(0, 500));
      if (!res.ok) {
        let msg = text || `Process failed (${res.status})`;
        try {
          const data = JSON.parse(text);
          if (data?.error) msg = data.error;
        } catch {
          // use raw text
        }
        throw new Error(msg);
      }
      const list = await fetchSubmissions();
      setSubmissions(list);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setProcessError(message);
      if (typeof window !== "undefined") window.alert(message);
      throw e;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-neutral-950 text-white px-4 py-16 text-center">
        <div className="mx-auto max-w-[1100px] px-6">
          <p className="text-white/80">{error}</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-white hover:text-white/80 underline">
            Try again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-neutral-950 text-white">
      <div className="mx-auto max-w-[1100px] px-6 py-8 sm:py-10">
        {/* Dashboard header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Projects</h1>
            <p className="mt-1 text-sm text-white/60">View and manage your quote reviews</p>
          </div>
          <Link
            href="/start?mode=new_project"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-white/90"
          >
            + New Project
          </Link>
        </div>

        {processError && (
          <div
            className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            <strong>Process error:</strong> {processError}
          </div>
        )}

        {highlightSubmissionId && (
          <div
            className="mb-6 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90"
            role="status"
          >
            {isConfirming
              ? "Payment submitted — confirming…"
              : "Payment received — processing your report."}
          </div>
        )}

        {/* Projects (grouped by project_id) */}
        <ProjectsSection
          projects={projects}
          highlightSubmissionId={highlightSubmissionId}
          onProcessSubmission={handleProcessSubmission}
        />

        {SHOW_LEGACY_REVIEWS && (
          <div className="mt-10">
            <ReviewsSection
              reviews={submissions as ReviewItem[]}
              highlightSubmissionId={highlightSubmissionId}
              onProcessSubmission={handleProcessSubmission}
            />
          </div>
        )}
      </div>
    </div>
  );
}
