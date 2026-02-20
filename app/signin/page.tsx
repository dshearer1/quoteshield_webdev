"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import Input from "@/components/ui/Input";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = searchParams.get("confirmed") === "1";

  useEffect(() => {
    let cancelled = false;
    createBrowserClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (!cancelled && session) router.replace("/dashboard");
      });
    return () => { cancelled = true; };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8">
        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-white">Sign in</h1>
          <p className="mt-1 text-sm text-white/60">Use your QuoteShield account.</p>

          {confirmed && (
            <div className="mt-4 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-200">
              Email confirmed. Sign in below to continue.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="signin-email" className="block text-sm font-medium text-white/80 mb-1.5">
                Email
              </label>
              <Input
                id="signin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                dark
                placeholder="you@email.com"
                className="mt-0"
              />
            </div>
            <div>
              <label htmlFor="signin-password" className="block text-sm font-medium text-white/80 mb-1.5">
                Password
              </label>
              <Input
                id="signin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                dark
                placeholder="••••••••"
                className="mt-0"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-white/60">
          Don’t have an account?{" "}
          <Link href="/start" className="font-medium text-white/80 hover:text-white transition">
            Start a review
          </Link>
        </p>
      </div>
    </div>
  );
}
