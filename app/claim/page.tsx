"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import { ClaimAccountForm } from "@/components/ClaimAccountForm";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function ClaimPage() {
  const searchParams = useSearchParams();
  const claimToken = searchParams.get("claim_token");
  const sessionId = searchParams.get("session_id");
  const [resolved, setResolved] = useState<"checking" | "claimed" | "guest" | "missing">("checking");
  const [prefilledEmail, setPrefilledEmail] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    if (!claimToken && !sessionId) {
      setResolved("missing");
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user?.id) {
        try {
          const body: { claim_token?: string; session_id?: string } = {};
          if (claimToken) body.claim_token = claimToken;
          if (sessionId) body.session_id = sessionId;
          const res = await fetch("/api/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify(body),
          });
          const data = await res.json().catch(() => ({}));
          if (cancelled) return;
          if (res.ok && data?.submission_id) {
            window.location.replace(`/dashboard?submission_id=${encodeURIComponent(data.submission_id)}`);
            setResolved("claimed");
            return;
          }
          setClaimError(data?.error ?? "Failed to claim");
        } catch {
          setClaimError("Failed to claim");
        }
        if (!cancelled) setResolved("guest");
        return;
      }
      if (sessionId) {
        try {
          const res = await fetch(`/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`);
          const data = await res.json().catch(() => ({}));
          if (!cancelled && data?.customer_email) setPrefilledEmail(data.customer_email);
        } catch {
          // ignore
        }
      }
      if (!cancelled) setResolved("guest");
    })();
    return () => { cancelled = true; };
  }, [claimToken, sessionId]);

  if (resolved === "missing") {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Invalid or missing claim link</h1>
          <p className="mt-2 text-gray-600">Use the link from your payment confirmation to claim your quote.</p>
        </div>
      </div>
    );
  }

  if (resolved === "checking" || resolved === "claimed") {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
          <p className="mt-4 text-sm text-gray-600">
            {resolved === "claimed" ? "Taking you to your dashboard…" : "Loading…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto mt-12 max-w-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-900">
            <CheckIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-gray-900">
            Payment received
          </h1>
          <p className="mt-2 text-gray-600">
            Create an account or sign in to attach this quote to your dashboard and access your report.
          </p>

          {claimError && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {claimError}
            </div>
          )}

          <div className="mt-10 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <ClaimAccountForm
              prefilledEmail={prefilledEmail}
              readOnlyEmail={!!prefilledEmail}
              submissionId={null}
              claimToken={claimToken ?? undefined}
              sessionId={sessionId ?? undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
