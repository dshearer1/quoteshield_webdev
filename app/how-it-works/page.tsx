import Link from "next/link";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* SECTION 1 — HERO */}
      <section className="bg-neutral-950 py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            How QuoteShield protects you before you sign
          </h1>
          <p className="text-xl text-white/80 leading-relaxed mb-10">
            Contractor quotes often hide missing scope, unclear pricing, or risky payment terms. QuoteShield gives you a second opinion — fast, clear, and homeowner-friendly.
          </p>
          <Link
            href="/start"
            className="inline-flex justify-center py-3.5 px-6 rounded-lg text-sm font-semibold text-black bg-white hover:bg-white/90 transition-colors"
          >
            Start free scan
          </Link>
          <p className="mt-6 text-sm text-white/50">
            Free scan shows risk score and red flags before you pay for anything.
          </p>
        </div>
      </section>

      {/* SECTION 2 — WHY REVIEWING QUOTES MATTERS */}
      <section className="py-16 md:py-20 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            Most quote problems aren’t obvious
          </h2>
          <p className="text-white/80 leading-relaxed mb-6">
            Contractor quotes can vary widely — even for the same job. The biggest risks usually aren’t the total price. They are hidden in scope details, payment terms, and missing protections.
          </p>
          <ul className="space-y-3 text-white/80">
            {[
              "Important materials missing from scope",
              "Payment schedules that favor the contractor",
              "No written timeline or milestones",
              "Warranty details that are unclear",
              "Cleanup or permit responsibility not defined",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-white/70 font-medium">
            Many homeowners only discover these issues after work begins.
          </p>
        </div>
      </section>

      {/* SECTION 3 — DIY vs QUOTESHIELD (objection handling) */}
      <section className="py-16 md:py-20 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">
            “Can’t I just review it myself?”
          </h2>
          <p className="text-white/80 leading-relaxed mb-12 text-center max-w-2xl mx-auto">
            You can absolutely review quotes yourself. The challenge is knowing what to look for. Contractor quotes often use technical language, industry shortcuts, or incomplete scope descriptions.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h3 className="font-semibold text-white mb-4">DIY Review</h3>
              <ul className="space-y-2.5 text-sm text-white/70">
                {[
                  "Requires researching construction standards",
                  "Hard to compare line items across contractors",
                  "Easy to overlook missing scope",
                  "Time consuming",
                  "Requires industry experience",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-white/40 mt-0.5">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/[0.06] p-6">
              <h3 className="font-semibold text-white mb-4">With QuoteShield</h3>
              <ul className="space-y-2.5 text-sm text-white/80">
                {[
                  "AI trained to detect common quote risks",
                  "Highlights missing or unclear scope",
                  "Translates contractor language into plain English",
                  "Provides negotiation guidance",
                  "Saves hours of research",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 mt-0.5">
                      <CheckIcon className="h-3 w-3 text-white" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — WHY AI HELPS */}
      <section className="py-16 md:py-20 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">
            Why QuoteShield uses AI
          </h2>
          <p className="text-white/80 leading-relaxed mb-6 text-center max-w-2xl mx-auto">
            Our AI analyzes contractor quotes using thousands of common scope standards, pricing patterns, and risk indicators found across construction projects.
          </p>
          <p className="text-white/70 leading-relaxed mb-12 text-center max-w-2xl mx-auto">
            The AI is not replacing contractors. It helps homeowners understand what contractors include, exclude, or leave unclear.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
              <h3 className="font-semibold text-white mb-2">Pattern Detection</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Identifies risky deposit structures and pricing anomalies.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
              <h3 className="font-semibold text-white mb-2">Scope Intelligence</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Detects missing materials, protection layers, and installation details.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
              <h3 className="font-semibold text-white mb-2">Plain Language Translation</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Explains contractor terminology in homeowner-friendly language.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — STEP BY STEP PROCESS */}
      <section className="py-16 md:py-20 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-12 text-center">
            Step-by-step process
          </h2>

          <div className="space-y-8">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 md:p-8">
              <span className="inline-flex w-9 h-9 rounded-full bg-white/20 text-white items-center justify-center text-sm font-bold mb-4">
                1
              </span>
              <h3 className="text-lg font-semibold text-white mb-2">Upload your quote</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                PDF preferred. We extract scope and pricing details securely. Your document is processed for analysis only — we don’t share it with third parties.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 md:p-8">
              <span className="inline-flex w-9 h-9 rounded-full bg-white/20 text-white items-center justify-center text-sm font-bold mb-4">
                2
              </span>
              <h3 className="text-lg font-semibold text-white mb-2">Get a free scan</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                See your risk score (0–100), top red flags, missing or unclear items, and questions to ask — all before paying. No commitment required.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 md:p-8">
              <span className="inline-flex w-9 h-9 rounded-full bg-white/20 text-white items-center justify-center text-sm font-bold mb-4">
                3
              </span>
              <h3 className="text-lg font-semibold text-white mb-2">Unlock full review (optional)</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Pay once per project to unlock the full report: scope audit, payment and timeline recommendations, cost breakdown, negotiation playbook, and downloadable report.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 md:p-8">
              <span className="inline-flex w-9 h-9 rounded-full bg-white/20 text-white items-center justify-center text-sm font-bold mb-4">
                4
              </span>
              <h3 className="text-lg font-semibold text-white mb-2">Use the report to make decisions</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Compare contractors with clarity, ask better questions, and clarify terms before signing. Use our guidance to negotiate with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — WHAT VALUE YOU GET */}
      <section className="py-16 md:py-20 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center">
            What homeowners gain from QuoteShield
          </h2>
          <ul className="space-y-4">
            {[
              "Better negotiation confidence",
              "Clear scope expectations",
              "Reduced project risk",
              "Faster contractor comparison",
              "Peace of mind before signing",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 mt-0.5">
                  <CheckIcon className="h-3 w-3 text-white" />
                </span>
                <span className="text-white/80">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SECTION 7 — TRUST & SAFETY */}
      <section className="py-16 md:py-20 border-t border-white/5">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            Independent and unbiased
          </h2>
          <p className="text-white/80 leading-relaxed mb-4">
            QuoteShield is not affiliated with contractors, suppliers, or insurance companies. Our goal is to help homeowners understand quotes clearly.
          </p>
          <p className="text-white/60 text-sm">
            We provide informational analysis, not legal or contractor services.
          </p>
        </div>
      </section>

      {/* SECTION 8 — FINAL CTA */}
      <section className="py-16 md:py-20 border-t border-white/5">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Review your quote with confidence
          </h2>
          <Link
            href="/start"
            className="inline-flex justify-center py-3.5 px-8 rounded-lg text-sm font-semibold text-black bg-white hover:bg-white/90 transition-colors"
          >
            Start free scan
          </Link>
          <p className="mt-6 text-sm text-white/50">
            Most homeowners only pay once per project.
          </p>
        </div>
      </section>
    </div>
  );
}
