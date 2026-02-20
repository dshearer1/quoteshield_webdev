"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabaseBrowser";

const TOC_ITEMS = [
  { href: "#pricing", label: "Pricing" },
  { href: "#what-youre-charged-for", label: "What You're Charged For" },
  { href: "#payment-methods", label: "Payment Methods" },
  { href: "#when-payment-is-collected", label: "When Payment Is Collected" },
  { href: "#receipts", label: "Receipts & Proof of Payment" },
  { href: "#failed-payments", label: "Failed Payments / Stuck Status" },
  { href: "#refunds", label: "Refund Policy" },
  { href: "#chargebacks", label: "Chargebacks & Disputes" },
  { href: "#taxes-discounts", label: "Taxes & Discounts" },
  { href: "#subscriptions", label: "Subscriptions (Future)" },
  { href: "#contact", label: "Contact Billing Support" },
];

type PaidSubmission = {
  id: string;
  token: string;
  status: string;
  paid_at: string | null;
  stripe_payment_intent: string | null;
  report_json?: {
    summary?: { total?: number; currency?: string };
    quote_overview?: { quote_total?: number; currency?: string };
  } | null;
};

export default function BillingPage() {
  const [recentPaid, setRecentPaid] = useState<PaidSubmission[]>([]);
  const [showPaymentIds, setShowPaymentIds] = useState(false);
  const [loadingPaid, setLoadingPaid] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoadingPaid(false);
          return;
        }
        const { data, error } = await supabase
          .from("submissions")
          .select("id, token, status, paid_at, stripe_payment_intent, report_json")
          .eq("user_id", session.user.id)
          .not("paid_at", "is", null)
          .order("paid_at", { ascending: false })
          .limit(10);
        if (!cancelled && !error && data?.length) setRecentPaid((data as PaidSubmission[]) ?? []);
      } catch {
        // Table or columns may not exist yet; hide section
      } finally {
        if (!cancelled) setLoadingPaid(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function getQuoteTotal(r: PaidSubmission["report_json"]): string | null {
    if (!r) return null;
    const total = r.summary?.total ?? r.quote_overview?.quote_total;
    const currency = r.summary?.currency ?? r.quote_overview?.currency ?? "USD";
    if (total == null) return null;
    return `${currency} ${Number(total).toLocaleString()}`;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Billing & Payments
        </h1>
        <p className="mt-2 text-white/60 text-sm">
          Last updated: February 10, 2026
        </p>
        <p className="mt-6 text-white/80 leading-relaxed">
          This page explains how QuoteShield billing works — pricing, payments, receipts, refunds, and what to do if something looks wrong.
        </p>

        <nav
          className="mt-10 p-6 rounded-xl border border-white/10 bg-white/5"
          aria-label="Table of contents"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4">
            Table of Contents
          </h2>
          <ul className="space-y-2">
            {TOC_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-white/80 hover:text-white transition text-sm"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {!loadingPaid && recentPaid.length > 0 && (
          <section className="mt-10 p-6 rounded-xl border border-white/10 bg-white/5">
            <h2 className="text-xl font-semibold text-white mb-4">Your recent payments</h2>
            <ul className="space-y-3">
              {recentPaid.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm border-b border-white/10 pb-3 last:border-0 last:pb-0"
                >
                  <span className="font-mono text-white/80">QS-{s.token.slice(0, 8).toUpperCase()}</span>
                  <span className="text-white/60">{s.status}</span>
                  {s.paid_at && (
                    <span className="text-white/60">
                      {new Date(s.paid_at).toLocaleDateString()}
                    </span>
                  )}
                  {getQuoteTotal(s.report_json) && (
                    <span className="text-white/80">{getQuoteTotal(s.report_json)}</span>
                  )}
                  <Link
                    href={`/r/${s.token}`}
                    className="text-white underline hover:no-underline ml-auto"
                  >
                    View report
                  </Link>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setShowPaymentIds((v) => !v)}
              className="mt-3 text-xs text-white/50 hover:text-white/70"
            >
              {showPaymentIds ? "Hide" : "Show"} payment intent IDs
            </button>
            {showPaymentIds && (
              <ul className="mt-2 space-y-1 text-xs font-mono text-white/50">
                {recentPaid.map((s) => (
                  <li key={s.id}>
                    {s.token.slice(0, 8).toUpperCase()}: {s.stripe_payment_intent ?? "—"}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <article className="mt-12 space-y-10">
          <section id="pricing">
            <h2 className="text-xl font-semibold text-white mb-3">Pricing</h2>
            <p className="text-white/80 leading-relaxed">
              QuoteShield charges per quote review (one-time purchase). Pricing is shown at checkout before you pay.
              If we introduce additional plans or subscription options, we&apos;ll clearly display them before purchase.
            </p>
          </section>

          <section id="what-youre-charged-for">
            <h2 className="text-xl font-semibold text-white mb-3">What You&apos;re Charged For</h2>
            <p className="text-white/80 leading-relaxed mb-3">Your purchase covers:</p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed">
              <li>Processing your uploaded quote document(s)</li>
              <li>Generating a structured analysis report</li>
              <li>Delivering the report in your dashboard (and downloadable format, if available)</li>
            </ul>
          </section>

          <section id="payment-methods">
            <h2 className="text-xl font-semibold text-white mb-3">Payment Methods</h2>
            <p className="text-white/80 leading-relaxed">
              We accept payment methods supported by Stripe Checkout (e.g., major credit/debit cards and other local methods depending on region).
            </p>
          </section>

          <section id="when-payment-is-collected">
            <h2 className="text-xl font-semibold text-white mb-3">When Payment Is Collected</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              Payment is collected at checkout before a report is generated.
              After successful payment:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed">
              <li>Your submission status will move to &quot;paid&quot; and then &quot;processing&quot;</li>
              <li>Your report will be generated and saved to your dashboard</li>
            </ul>
          </section>

          <section id="receipts">
            <h2 className="text-xl font-semibold text-white mb-3">Receipts & Proof of Payment</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              Stripe provides a receipt for most payments.
              We may also store payment identifiers (like a checkout session ID or payment intent ID) to confirm payment and provide support.
            </p>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-white/90 mb-2">Receipts</h3>
              <ul className="text-sm text-white/80 space-y-1">
                <li>• Need a receipt? Use your email confirmation from Stripe.</li>
                <li>• If you can&apos;t find it, contact support with your email + public submission ID.</li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/support"
                  className="inline-flex rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition"
                >
                  Contact Support
                </Link>
              </div>
            </div>
          </section>

          <section id="failed-payments">
            <h2 className="text-xl font-semibold text-white mb-3">Failed Payments / Stuck Status</h2>
            <p className="text-white/80 leading-relaxed mb-3">If you see any of these:</p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed mb-4">
              <li>Payment succeeded but submission still shows &quot;unpaid&quot;</li>
              <li>Submission stuck in &quot;processing&quot; longer than expected</li>
              <li>You were charged twice</li>
            </ul>
            <p className="text-white/80 leading-relaxed mb-3">Do this:</p>
            <ol className="list-decimal pl-5 space-y-2 text-white/80 text-sm leading-relaxed mb-4">
              <li>Refresh your dashboard</li>
              <li>Confirm you used the correct email at checkout</li>
              <li>Contact support with: your email, your submission public ID (example: QS-31CEB336), and any Stripe receipt or payment confirmation</li>
            </ol>
            <Link
              href="/support"
              className="inline-flex rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition"
            >
              Contact Support
            </Link>
          </section>

          <section id="refunds">
            <h2 className="text-xl font-semibold text-white mb-3">Refund Policy</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              We want billing to be fair and transparent.
            </p>
            <p className="text-white/80 leading-relaxed mb-3"><strong className="text-white/90">General policy:</strong></p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed mb-4">
              <li>If a report cannot be generated due to a technical failure on our side, contact support and we will work to fix it or provide an appropriate refund.</li>
              <li>If a report has been successfully generated and delivered, refunds are not guaranteed because the service has been performed, but we may review requests case-by-case.</li>
            </ul>
            <p className="text-white/80 leading-relaxed mb-3">To request a refund, contact support with:</p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed">
              <li>Email used at checkout</li>
              <li>Submission public ID</li>
              <li>Reason for request</li>
            </ul>
          </section>

          <section id="chargebacks">
            <h2 className="text-xl font-semibold text-white mb-3">Chargebacks & Disputes</h2>
            <p className="text-white/80 leading-relaxed">
              If you believe a charge is incorrect, please contact us first so we can help.
              Unresolved disputes may be handled through your payment provider (Stripe/card issuer). Chargebacks may result in account restrictions if abuse is detected.
            </p>
          </section>

          <section id="taxes-discounts">
            <h2 className="text-xl font-semibold text-white mb-3">Taxes & Discounts</h2>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed">
              <li>Taxes may apply depending on your location and applicable laws.</li>
              <li>If a discount is applied, it will be shown at checkout and reflected in your receipt.</li>
            </ul>
          </section>

          <section id="subscriptions">
            <h2 className="text-xl font-semibold text-white mb-3">Subscriptions (Future)</h2>
            <p className="text-white/80 leading-relaxed">
              If we introduce subscriptions in the future (e.g., ongoing quote reviews, priority support, or multi-quote comparisons), we will update this page to include: renewal terms, cancellation instructions, and proration (if applicable).
            </p>
          </section>

          <section id="contact">
            <h2 className="text-xl font-semibold text-white mb-3">Contact Billing Support</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              Questions about a charge, receipt, or refund?
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed mb-4">
              <li>Go to <Link href="/support" className="text-white underline hover:no-underline">/support</Link> and choose &quot;Payment issue&quot;</li>
              <li>Include your email + submission public ID</li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/support"
                className="inline-flex rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition"
              >
                Contact Support
              </Link>
              <Link
                href="/business-contact"
                className="inline-flex rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition"
              >
                Business Invoices
              </Link>
            </div>
            <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-white/90 mb-2">Tip</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                For the fastest help, include your public submission ID (e.g., QS-31CEB336) and your Stripe receipt email.
              </p>
            </div>
          </section>
        </article>

      </div>
    </div>
  );
}
