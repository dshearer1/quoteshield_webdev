import Link from "next/link";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        {/* 1. Hero */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Simple, fair pricing — no subscriptions required
        </h1>
        <p className="mt-4 text-white/80 leading-relaxed">
          Pay only when you need help reviewing a contractor quote.
          No long-term commitments. No hidden fees.
        </p>
        <p className="mt-2 text-white/50 text-sm">
          Most homeowners only need QuoteShield once — and that&apos;s okay.
        </p>

        {/* 2. Pricing Cards */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {/* Card 1 — Free Scan */}
          <section className="p-6 rounded-xl border border-white/10 bg-white/5 flex flex-col">
            <h2 className="text-xl font-semibold text-white">Free Quote Scan</h2>
            <p className="mt-2 text-2xl font-bold tracking-tight text-white">$0</p>
            <p className="mt-3 text-white/80 text-sm leading-relaxed">
              A quick AI-powered scan to identify obvious risks before you decide to dig deeper.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-white/60"><CheckIcon className="h-4 w-4" /></span>
                Basic risk score
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-white/60"><CheckIcon className="h-4 w-4" /></span>
                High-level red flag preview
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-white/60"><CheckIcon className="h-4 w-4" /></span>
                Missing information checklist
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-white/60"><CheckIcon className="h-4 w-4" /></span>
                No payment required
              </li>
            </ul>
            <div className="mt-auto pt-6">
              <Link
                href="/start"
                className="block w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Start free scan
              </Link>
            </div>
          </section>

          {/* Card 2 — Full Quote Review (Primary) */}
          <section className="p-6 rounded-xl border border-white/20 bg-white/5 flex flex-col relative">
            <span className="absolute top-4 right-4 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white/90">
              Most popular
            </span>
            <h2 className="text-xl font-semibold text-white">Full Quote Review</h2>
            <p className="mt-2 text-2xl font-bold tracking-tight text-white">$39 per project</p>
            <p className="mt-3 text-white/80 text-sm leading-relaxed">
              A detailed, homeowner-friendly breakdown designed to help you understand pricing, scope, and risks before you sign.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-white/60"><CheckIcon className="h-4 w-4" /></span>
                Full AI quote analysis
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-white/60"><CheckIcon className="h-4 w-4" /></span>
                Payment & deposit risk review
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-white/60"><CheckIcon className="h-4 w-4" /></span>
                Timeline & milestone planner
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-white/60"><CheckIcon className="h-4 w-4" /></span>
                Cost breakdown intelligence
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-white/60"><CheckIcon className="h-4 w-4" /></span>
                Scope & materials completeness audit
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-white/60"><CheckIcon className="h-4 w-4" /></span>
                Negotiation suggestions
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-white/60"><CheckIcon className="h-4 w-4" /></span>
                Shareable report + downloadable summary
              </li>
            </ul>
            <div className="mt-auto pt-6">
              <Link
                href="/start"
                className="block w-full rounded-lg bg-white px-4 py-2.5 text-center text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Unlock full review
              </Link>
            </div>
          </section>
        </div>

        {/* 3. What's Included — optional comparison callout if desired; spec said "What's Included Comparison" — keeping it implied by the two cards above. Skipping a separate comparison section to avoid duplication. */}

        {/* 4. Optional Add-Ons */}
        <section className="mt-14">
          <h2 className="text-xl font-semibold text-white">
            Optional add-ons (only if you need them)
          </h2>
          <div className="mt-6 space-y-4">
            <div className="p-5 rounded-xl border border-white/10 bg-white/5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium text-white">Contractor Response Review</h3>
                <span className="text-sm font-semibold text-white/90">$9 per response</span>
              </div>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">
                Paste a contractor&apos;s reply and get help understanding what it really means — including risks, vague language, or missing details.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-white/10 bg-white/5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium text-white">Quote Comparison</h3>
                <span className="text-sm font-semibold text-white/90">$19 per additional quote</span>
              </div>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">
                Compare multiple contractor quotes side-by-side to spot pricing gaps, scope differences, and risk factors.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-white/10 bg-white/5 opacity-90">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium text-white">Expert Review</h3>
                <span className="text-sm font-semibold text-white/90">From $99</span>
              </div>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">
                Optional professional review by a construction expert for high-value projects.
              </p>
              <span className="mt-2 inline-block rounded bg-white/10 px-2 py-0.5 text-xs font-medium text-white/80">
                Coming soon
              </span>
            </div>
          </div>
        </section>

        {/* 5. Trust */}
        <section className="mt-14 p-6 rounded-xl border border-white/10 bg-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            Why homeowners trust QuoteShield
          </h2>
          <ul className="space-y-3 text-white/80 text-sm leading-relaxed">
            <li className="flex gap-2">
              <span className="text-white/60 shrink-0">•</span>
              Independent analysis — we don&apos;t work for contractors
            </li>
            <li className="flex gap-2">
              <span className="text-white/60 shrink-0">•</span>
              Built to help you avoid costly mistakes
            </li>
            <li className="flex gap-2">
              <span className="text-white/60 shrink-0">•</span>
              Designed for real homeowners, not legal experts
            </li>
            <li className="flex gap-2">
              <span className="text-white/60 shrink-0">•</span>
              You keep full control of your decisions
            </li>
          </ul>
          <p className="mt-4 text-xs text-white/50 leading-relaxed">
            QuoteShield does not replace licensed professionals — it helps you ask better questions.
          </p>
        </section>

        {/* 6. FAQ */}
        <section className="mt-14">
          <h2 className="text-xl font-semibold text-white mb-4">FAQ</h2>
          <dl className="space-y-5">
            <div>
              <dt className="font-medium text-white/90">Do I need a subscription?</dt>
              <dd className="mt-1 text-sm text-white/70 leading-relaxed">
                No. Most users only pay once per project.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-white/90">Will QuoteShield negotiate with my contractor?</dt>
              <dd className="mt-1 text-sm text-white/70 leading-relaxed">
                No — but we help you understand responses and suggest what to ask next.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-white/90">Is this worth it for small projects?</dt>
              <dd className="mt-1 text-sm text-white/70 leading-relaxed">
                If a mistake could cost you hundreds or thousands, most homeowners say yes.
              </dd>
            </div>
          </dl>
        </section>

        {/* 7. Final CTA */}
        <section className="mt-14 p-6 rounded-xl border border-white/10 bg-white/5 text-center">
          <h2 className="text-xl font-semibold text-white">
            Review your quote with confidence
          </h2>
          <Link
            href="/start"
            className="mt-4 inline-block rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            Start free scan
          </Link>
          <p className="mt-3 text-xs text-white/50">
            Upgrade only when you need more.
          </p>
        </section>

      </div>
    </div>
  );
}
