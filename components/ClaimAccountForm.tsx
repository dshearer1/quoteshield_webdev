"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabaseBrowser";

export function ClaimAccountForm({
  prefilledEmail,
  readOnlyEmail,
  submissionId,
  claimToken = null,
  sessionId = null,
  onSuccess,
}: {
  prefilledEmail: string;
  readOnlyEmail: boolean;
  submissionId: string | null;
  claimToken?: string | null;
  sessionId?: string | null;
  /** When provided, called after successful link-submission instead of redirecting to dashboard. */
  onSuccess?: () => void;
}) {
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const useClaimApi = !!(claimToken || sessionId);

  async function claimAndRedirect(accessToken: string) {
    const body: { claim_token?: string; session_id?: string } = {};
    if (claimToken) body.claim_token = claimToken;
    if (sessionId) body.session_id = sessionId;
    const claimRes = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    const claimJson = await claimRes.json();
    if (!claimRes.ok) {
      setError(claimJson?.error ?? "Failed to claim quote.");
      setLoading(false);
      return;
    }
    const sid = claimJson?.submission_id;
    window.location.href = sid ? `/dashboard?submission_id=${encodeURIComponent(sid)}` : "/dashboard";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsEmailConfirm(false);
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (useClaimApi) {
      if (!claimToken && !sessionId) {
        setError("Missing claim link. Return to the link from your payment.");
        return;
      }
    } else if (!submissionId) {
      setError("Missing quote. Return to the success page from your payment link.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        },
      });

      if (signUpError) {
        const msg = signUpError.message;
        setError(
          msg?.toLowerCase().includes("already registered")
            ? "An account with this email already exists. Sign in below to claim your quote."
            : msg
        );
        setLoading(false);
        return;
      }

      const session = signUpData?.session;
      if (!session?.access_token) {
        setNeedsEmailConfirm(true);
        setLoading(false);
        return;
      }

      if (useClaimApi) {
        await claimAndRedirect(session.access_token);
        return;
      }

      const linkRes = await fetch("/api/auth/link-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ submissionId }),
      });
      const linkJson = await linkRes.json();

      if (!linkRes.ok) {
        setError(linkJson?.error ?? "Failed to link quote.");
        setLoading(false);
        return;
      }

      if (onSuccess) {
        onSuccess();
        setLoading(false);
        return;
      }
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendError(null);
    setResendLoading(true);
    try {
      const supabase = createBrowserClient();
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
      });
      if (resendErr) {
        setResendError(resendErr.message);
        return;
      }
      setResendSent(true);
    } finally {
      setResendLoading(false);
    }
  }

  if (needsEmailConfirm) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-xl font-semibold text-gray-900">Check your email</h1>
        <p className="mt-1 text-sm text-gray-600">
          We sent a confirmation link to <strong>{email}</strong>. Click it to verify your account, then sign in to access your report.
        </p>
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Account created. After confirming your email, sign in to view your report in the dashboard.
        </div>
        <Link
          href="/signin"
          className="mt-6 flex w-full justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        >
          Go to sign in
        </Link>
        <p className="mt-4 text-center text-sm text-gray-600">
          Didn’t get the email? Check your spam folder or wait a minute — it can take a moment to arrive.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading || resendSent}
            className="text-sm font-medium text-gray-900 hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {resendLoading ? "Sending…" : resendSent ? "Email sent again" : "Resend confirmation email"}
          </button>
          {resendError && (
            <p className="text-sm text-red-600" role="alert">
              {resendError}
            </p>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-gray-600">
          Already confirmed?{" "}
          <Link href="/signin" className="font-medium text-gray-900 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold text-gray-900">Create your account</h1>
      <p className="mt-1 text-sm text-gray-600">
        Claim this quote and access your report from the dashboard.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="claim-email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="claim-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={readOnlyEmail}
            autoComplete="email"
            className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="claim-password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="claim-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 sm:text-sm"
            placeholder="At least 8 characters"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/signin" className="font-medium text-gray-900 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
