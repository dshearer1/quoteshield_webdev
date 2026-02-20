"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

const INQUIRY_TYPES = [
  "Contractor inquiry",
  "Insurance / claims",
  "Real estate / property management",
  "Media / press",
  "Partnership discussion",
  "Other business inquiry",
];

export default function BusinessContactPage() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [inquiryType, setInquiryType] = useState("");
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inquiryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (inquiryRef.current && !inquiryRef.current.contains(e.target as Node)) {
        setInquiryOpen(false);
      }
    }
    if (inquiryOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [inquiryOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!inquiryType) {
      setError("Please select an inquiry type.");
      return;
    }
    if (trimmedMessage.length < 10) {
      setError("Please enter at least 10 characters in your message.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/business-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          company: company.trim() || undefined,
          email: trimmedEmail,
          inquiryType,
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
      setError("Something went wrong. Please try again or email business@quoteshield.com.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Message received</h2>
            <p className="text-white/80 leading-relaxed mb-6">
              Thanks for reaching out. Your message has been received and routed to the appropriate team. We&apos;ll follow up if additional information is needed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Business Contact
        </h1>
        <p className="mt-4 text-white/80 leading-relaxed">
          For contractors, insurers, and professional inquiries related to QuoteShield.
        </p>
        <p className="mt-2 text-white/60 text-sm">
          If you&apos;re a homeowner with a question about a quote review or payment, please visit{" "}
          <Link href="/support" className="text-white/80 underline hover:no-underline">Support</Link>.
        </p>

        <section className="mt-10 p-6 rounded-xl border border-white/10 bg-white/5">
          <h2 className="text-xl font-semibold text-white mb-3">Business & professional inquiries</h2>
          <ul className="list-disc pl-5 space-y-2 text-white/80 text-sm leading-relaxed">
            <li>Contractors with general questions about QuoteShield</li>
            <li>Insurance adjusters or claims professionals</li>
            <li>Real estate professionals and property managers</li>
            <li>Media or press inquiries</li>
            <li>Potential partners (non-affiliate)</li>
          </ul>
          <p className="mt-4 text-white/60 text-sm">
            We do not use this form for quote reviews or customer support.
          </p>
        </section>

        <section className="mt-10 p-6 rounded-xl border border-white/10 bg-white/5">
          <h2 className="text-xl font-semibold text-white mb-2">Contact us</h2>
          <p className="text-white/80 text-sm mb-6">
            Send us a message and we&apos;ll route it to the right team.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="bc-name" className="block text-sm font-medium text-white/80 mb-1">
                Full name <span className="text-white/50">(required)</span>
              </label>
              <input
                id="bc-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="bc-company" className="block text-sm font-medium text-white/80 mb-1">
                Company / Organization <span className="text-white/50">(optional)</span>
              </label>
              <input
                id="bc-company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                placeholder="Company name"
              />
            </div>
            <div>
              <label htmlFor="bc-email" className="block text-sm font-medium text-white/80 mb-1">
                Email address <span className="text-white/50">(required)</span>
              </label>
              <input
                id="bc-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                placeholder="you@company.com"
              />
            </div>
            <div ref={inquiryRef}>
              <label id="bc-inquiry-label" className="block text-sm font-medium text-white/80 mb-1">
                Inquiry type <span className="text-white/50">(required)</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={inquiryOpen}
                  aria-labelledby="bc-inquiry-label"
                  onClick={() => setInquiryOpen((o) => !o)}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-left text-white focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 flex items-center justify-between"
                >
                  <span className={inquiryType ? "" : "text-white/40"}>{inquiryType || "Select…"}</span>
                  <svg className="h-4 w-4 shrink-0 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={inquiryOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                  </svg>
                </button>
                {inquiryOpen && (
                  <ul
                    role="listbox"
                    aria-labelledby="bc-inquiry-label"
                    className="absolute z-10 mt-1 w-full rounded-lg border border-white/20 bg-neutral-900 py-1 shadow-lg"
                  >
                    {INQUIRY_TYPES.map((type) => (
                      <li
                        key={type}
                        role="option"
                        aria-selected={inquiryType === type}
                        onClick={() => {
                          setInquiryType(type);
                          setInquiryOpen(false);
                        }}
                        className="cursor-pointer px-3 py-2 text-sm text-white/90 hover:bg-white/10 focus:bg-white/10 focus:outline-none"
                      >
                        {type}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="bc-message" className="block text-sm font-medium text-white/80 mb-1">
                Message <span className="text-white/50">(required)</span>
              </label>
              <textarea
                id="bc-message"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 resize-y"
                placeholder="Briefly describe your inquiry and any relevant context."
              />
              <p className="mt-1.5 text-xs text-white/50">
                Please do not include sensitive personal or customer data.
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
            You can reach us directly at:{" "}
            <a href="mailto:business@quoteshield.com" className="text-white underline hover:no-underline">
              business@quoteshield.com
            </a>
          </p>
          <p className="mt-2 text-white/50 text-xs">
            (If you don&apos;t have this email yet, still include it — you can forward it later.)
          </p>
        </section>

      </div>
    </div>
  );
}
