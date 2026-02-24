"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabaseBrowser";

export default function CheckoutReturnPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"confirming" | "redirecting" | "error">("confirming");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setErrorMessage("Missing session. Return to your report and try again.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/stripe/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const data = await res.json().catch(() => ({}));

        if (cancelled) return;
        if (!res.ok) {
          setErrorMessage(data?.error ?? "Payment could not be confirmed.");
          setStatus("error");
          return;
        }

        const submissionId = data.submission_id;
        const token = data.token ?? submissionId;
        const premiumUrl = `/r/${encodeURIComponent(token)}/premium`;

        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (!session?.user?.id) {
          const signinUrl = `/signin?next=${encodeURIComponent(premiumUrl)}&sid=${encodeURIComponent(submissionId)}`;
          setStatus("redirecting");
          window.location.href = signinUrl;
          return;
        }

        await fetch("/api/submissions/claim", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ submission_id: submissionId }),
        });
        if (cancelled) return;

        setStatus("redirecting");
        window.location.replace(premiumUrl);
      } catch (e) {
        if (!cancelled) {
          setErrorMessage(e instanceof Error ? e.message : "Something went wrong.");
          setStatus("error");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-6">
      {status === "confirming" && (
        <>
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="mt-4 text-white/80">Confirming payment…</p>
        </>
      )}
      {status === "redirecting" && (
        <>
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="mt-4 text-white/80">Taking you to your report…</p>
        </>
      )}
      {status === "error" && (
        <>
          <p className="text-white font-medium">Something went wrong</p>
          <p className="mt-2 text-sm text-white/70 text-center max-w-md">
            {errorMessage}
          </p>
          <Link
            href="/start"
            className="mt-6 text-sm text-white/80 hover:text-white underline"
          >
            Return to start
          </Link>
        </>
      )}
    </div>
  );
}
