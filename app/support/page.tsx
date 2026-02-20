"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@/lib/supabaseBrowser";

const CATEGORIES = [
  "Upload issue",
  "Report issue",
  "Payment issue",
  "Account/login",
  "Business inquiry",
  "Other",
];

export default function SupportPage() {
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [submissionPublicId, setSubmissionPublicId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    }
    if (categoryOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [categoryOpen]);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setEmail(session.user.email);
      if (session?.access_token) setAccessToken(session.access_token);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!category) {
      setError("Please select a category.");
      return;
    }
    if (trimmedMessage.length < 10) {
      setError("Please enter at least 10 characters in your message.");
      return;
    }
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch("/api/support", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: trimmedEmail,
          category,
          submissionPublicId: submissionPublicId.trim() || undefined,
          message: trimmedMessage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again or email support@quoteshield.com.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
          <div className="p-6 rounded-xl border border-white/10 bg-white/5">
            <h2 className="text-xl font-semibold text-white mb-3">Message received</h2>
            <p className="text-white/80 leading-relaxed mb-6">
              Thanks — we&apos;ve received your message. If you included a submission/public ID, we&apos;ll use it to investigate faster.
            </p>
            <Link
              href="/dashboard"
              className="inline-block text-sm font-medium text-white/80 hover:text-white transition"
            >
              Return to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Support
        </h1>
        <p className="mt-4 text-white/80 leading-relaxed">
          Need help with a quote review, report, or payment? We&apos;ll point you in the right direction.
        </p>
        <p className="mt-2 text-white/50 text-sm">
          We typically respond within 1–2 business days.
        </p>

        <section className="mt-10 p-6 rounded-xl border border-white/10 bg-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">Quick answers</h2>
          <dl className="space-y-5 text-sm">
            <div>
              <dt className="font-medium text-white/90 mb-1">&quot;I uploaded a quote — where is my report?&quot;</dt>
              <dd className="text-white/80 leading-relaxed">
                After payment, your report is generated and will appear in your dashboard. If it&apos;s stuck in &quot;processing&quot; for more than a few minutes, contact support below.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-white/90 mb-1">&quot;My PDF upload failed&quot;</dt>
              <dd className="text-white/80 leading-relaxed">
                Try a smaller file, ensure it&apos;s a PDF, and check your internet connection. If it still fails, send us the submission ID or screenshot.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-white/90 mb-1">&quot;I see missing info in my report&quot;</dt>
              <dd className="text-white/80 leading-relaxed">
                That usually means the quote didn&apos;t include details in writing. Use the Negotiation Suggestions to request clarification from the contractor.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-white/90 mb-1">&quot;Payment went through but my status didn&apos;t update&quot;</dt>
              <dd className="text-white/80 leading-relaxed">
                Sometimes payment confirmation can take a moment. If your submission still isn&apos;t marked &quot;paid&quot; after a few minutes, contact us below with your email and public ID.
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-10 p-6 rounded-xl border border-white/10 bg-white/5">
          <h2 className="text-xl font-semibold text-white mb-2">Contact support</h2>
          <p className="text-white/80 text-sm mb-6">
            Send us a message and include any details you can. The more context you share, the faster we can help.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="support-email" className="block text-sm font-medium text-white/80 mb-1">
                Email <span className="text-white/50">(required)</span>
              </label>
              <input
                id="support-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                placeholder="you@example.com"
              />
            </div>
            <div ref={categoryRef}>
              <label id="support-category-label" className="block text-sm font-medium text-white/80 mb-1">
                Category <span className="text-white/50">(required)</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={categoryOpen}
                  aria-labelledby="support-category-label"
                  onClick={() => setCategoryOpen((o) => !o)}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-left text-white focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 flex items-center justify-between"
                >
                  <span className={category ? "" : "text-white/40"}>{category || "Select…"}</span>
                  <svg className="h-4 w-4 shrink-0 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={categoryOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                  </svg>
                </button>
                {categoryOpen && (
                  <ul
                    role="listbox"
                    aria-labelledby="support-category-label"
                    className="absolute z-10 mt-1 w-full rounded-lg border border-white/20 bg-neutral-900 py-1 shadow-lg"
                  >
                    {CATEGORIES.map((c) => (
                      <li
                        key={c}
                        role="option"
                        aria-selected={category === c}
                        onClick={() => {
                          setCategory(c);
                          setCategoryOpen(false);
                        }}
                        className="cursor-pointer px-3 py-2 text-sm text-white/90 hover:bg-white/10 focus:bg-white/10 focus:outline-none"
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="support-id" className="block text-sm font-medium text-white/80 mb-1">
                Submission ID / Public ID <span className="text-white/50">(optional)</span>
              </label>
              <input
                id="support-id"
                type="text"
                value={submissionPublicId}
                onChange={(e) => setSubmissionPublicId(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                placeholder="Example: QS-31CEB336"
              />
            </div>
            <div>
              <label htmlFor="support-message" className="block text-sm font-medium text-white/80 mb-1">
                Message <span className="text-white/50">(required)</span>
              </label>
              <textarea
                id="support-message"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 resize-y"
                placeholder="Tell us what happened, what you expected, and any error message you saw."
              />
              <p className="mt-1.5 text-xs text-white/50">
                Do not include sensitive personal data (e.g., SSNs or full card numbers).
              </p>
            </div>
            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-white text-black px-4 py-2.5 text-sm font-semibold hover:bg-white/90 transition disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send message"}
            </button>
          </form>
        </section>

        <section className="mt-10 p-6 rounded-xl border border-white/10 bg-white/5">
          <h2 className="text-xl font-semibold text-white mb-2">Prefer email?</h2>
          <p className="text-white/80 text-sm">
            You can email us at{" "}
            <a href="mailto:support@quoteshield.com" className="text-white underline hover:no-underline">
              support@quoteshield.com
            </a>
          </p>
        </section>

        <section className="mt-10 p-6 rounded-xl border border-white/10 bg-white/5">
          <h2 className="text-xl font-semibold text-white mb-2">Business inquiries</h2>
          <p className="text-white/80 text-sm">
            If you&apos;re a contractor, insurer, or partner, use our business contact page:{" "}
            <Link href="/business-contact" className="text-white underline hover:no-underline">
              /business-contact
            </Link>
          </p>
        </section>

      </div>
    </div>
  );
}
