"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabaseBrowser";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingUI />}>
      <AuthCallbackInner />
    </Suspense>
  );
}

function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const next = searchParams.get("next");

      if (!tokenHash || !type) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage("Invalid or expired link. Try signing in or request a new confirmation email.");
        }
        return;
      }

      try {
        const supabase = createBrowserClient();
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email",
        });

        if (cancelled) return;
        if (error) {
          setStatus("error");
          setErrorMessage(error.message);
          return;
        }

        setStatus("success");
        const redirectTo = next && next.startsWith("/") ? next : "/dashboard";
        window.location.replace(redirectTo);
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (status === "loading" || status === "success") return <LoadingUI status={status} />;

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50">
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Link invalid or expired</h1>
        <p className="mt-2 text-gray-600">{errorMessage}</p>
        <Link
          href="/signin"
          className="mt-6 inline-block rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  );
}

function LoadingUI({ status }: { status?: "loading" | "success" }) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
        <p className="mt-4 text-sm text-gray-600">
          {status === "success" ? "Signing you in…" : "Confirming your email…"}
        </p>
      </div>
    </div>
  );
}