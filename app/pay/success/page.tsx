"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Legacy: Stripe success now goes to /claim. Redirect pay/success?session_id=... to /claim so old links work.
 */
export default function PaySuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      window.location.replace(`/claim?session_id=${encodeURIComponent(sessionId)}`);
    }
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Invalid or missing session</h1>
          <p className="mt-2 text-gray-600">Use the link from your payment confirmation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
        <p className="mt-4 text-sm text-gray-600">Taking you to claim your quote…</p>
      </div>
    </div>
  );
}
