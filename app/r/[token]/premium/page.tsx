"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import { ReportView } from "@/components/ReportView";
import Link from "next/link";

type Payload = {
  submissionId: string;
  data: Record<string, unknown>;
  reportJson: string;
  aiConfidence: string | null;
  initialChatMessages: Array<{ id: string; role: "user" | "assistant"; message_text: string; created_at: string }>;
  lineItems: Array<{ id: string; category?: string; description_raw?: string; quantity?: number; unit_price?: number; line_total?: number; sort_order?: number }>;
  analysis: Record<string, unknown> | null;
};

export default function PremiumReportPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params?.token === "string" ? params.token : "";
  const [status, setStatus] = useState<"loading" | "claiming" | "ready" | "not_ready" | "forbidden" | "error">("loading");
  const [payload, setPayload] = useState<Payload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Invalid report link.");
      return;
    }

    let cancelled = false;

    (async () => {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session?.user?.id) {
        const nextUrl = `/r/${encodeURIComponent(token)}/premium`;
        router.replace(`/signin?next=${encodeURIComponent(nextUrl)}`);
        return;
      }

      setStatus("claiming");
      try {
        const res = await fetch(`/api/submissions/premium-report?token=${encodeURIComponent(token)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.status === 202) {
          setStatus("not_ready");
          setErrorMessage("Report is still being generated. Refresh in a moment.");
          return;
        }
        if (res.status === 401) {
          router.replace(`/signin?next=${encodeURIComponent(`/r/${token}/premium`)}`);
          return;
        }
        if (res.status === 403 || res.status === 404) {
          setStatus("forbidden");
          setErrorMessage(data?.error ?? "You don’t have access to this report.");
          return;
        }
        if (!res.ok) {
          setStatus("error");
          setErrorMessage(data?.error ?? "Failed to load report.");
          return;
        }

        setPayload(data as Payload);
        setStatus("ready");
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(e instanceof Error ? e.message : "Failed to load report.");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [token, router]);

  if (status === "loading" || status === "claiming") {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-neutral-950 text-white flex flex-col items-center justify-center px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        <p className="mt-4 text-white/80">
          {status === "claiming" ? "Claiming purchase…" : "Loading report…"}
        </p>
      </div>
    );
  }

  if (status === "not_ready" || status === "forbidden" || status === "error") {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-neutral-950 text-white flex flex-col items-center justify-center px-6">
        <p className="text-lg font-medium text-white">{status === "not_ready" ? "Report not ready yet" : status === "forbidden" ? "Access denied" : "Something went wrong"}</p>
        <p className="mt-2 text-sm text-white/70 text-center max-w-md">{errorMessage}</p>
        <Link href="/dashboard" className="mt-6 text-sm text-white/80 hover:text-white underline">
          Go to dashboard
        </Link>
        {token && (
          <Link href={`/r/${token}`} className="mt-3 text-sm text-white/60 hover:text-white/80">
            View free report
          </Link>
        )}
      </div>
    );
  }

  if (!payload) return null;

  const lineItems: Parameters<typeof ReportView>[0]["lineItems"] = (payload.lineItems ?? []).map((li) => ({
    ...li,
    category: li.category ?? null,
    description_raw: li.description_raw ?? null,
    quantity: li.quantity ?? null,
    unit_price: li.unit_price ?? null,
    line_total: li.line_total ?? null,
  }));

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-neutral-950 text-white">
      <div className="mx-auto max-w-[1100px] px-6 py-8 sm:py-10">
        <ReportView
          data={payload.data as Parameters<typeof ReportView>[0]["data"]}
          reportJson={payload.reportJson}
          aiConfidence={payload.aiConfidence}
          submissionId={payload.submissionId}
          initialChatMessages={payload.initialChatMessages}
          lineItems={lineItems}
          analysis={payload.analysis as Parameters<typeof ReportView>[0]["analysis"]}
        />
      </div>
    </div>
  );
}
