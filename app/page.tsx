import Link from "next/link";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* HERO */}
      <section className="bg-neutral-950 py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
                Run your quote through QuoteShield — before you sign.
              </h1>
              <p className="text-xl text-white/80 leading-relaxed mb-4">
                Get a clear risk score, red flags, and what’s missing. No commitment until you’re ready.
              </p>
              <p className="text-white/70 leading-relaxed mb-8 max-w-lg">
                Thousands of homeowners run their contractor quotes through us every year. Start with a free scan; upgrade only if you want the full report with pricing insights, scope audit, and negotiation guidance.
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 gap-4">
                <Link
                  href="/start"
                  className="inline-flex justify-center py-3.5 px-6 rounded-lg text-sm font-semibold text-black bg-white hover:bg-white/90 transition-colors"
                >
                  Run my quote — free scan
                </Link>
                <a href="#example-report" className="text-white/80 font-medium hover:text-white text-sm transition-colors">
                  See an example report
                </a>
              </div>

              <p className="mt-5 text-sm text-white/50">
                Have a quote? Run it through in ~2 minutes · No subscription · Pay once per project
              </p>
            </div>

            <div className="hidden lg:block">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
                <h3 className="font-semibold text-white">Included in your free scan</h3>
                <ul className="mt-4 space-y-2.5 text-sm text-white/80">
                  {[
                    "Risk score (0–100) with confidence level",
                    "Top red flags preview",
                    "Missing or unclear info checklist",
                    "Questions to ask your contractor",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                        <CheckIcon className="h-3 w-3 text-white" />
                      </span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-xs font-medium text-white/50 uppercase tracking-wider">Full review also includes</p>
                <ul className="mt-2 space-y-2 text-sm text-white/60">
                  {[
                    "Scope & materials audit",
                    "Payment + timeline recommendations",
                    "Negotiation playbook",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="text-white/40">+</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EXAMPLE REPORT */}
      <section id="example-report" className="bg-neutral-950 py-16 md:py-20 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 text-center">
            See what you’ll get when you run your quote
          </h2>
          <p className="text-white/70 text-center mb-10 max-w-xl mx-auto">
            Run your own quote through QuoteShield to get a real risk score and recommendations — or see a sample below.
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h3 className="font-semibold text-white mb-4">Free scan (preview)</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Risk score</p>
                  <p className="font-medium text-white">64 / 100 · Moderate</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Red flags</p>
                  <ul className="space-y-1 text-white/80">
                    <li>· Deposit requested &gt;30% upfront</li>
                    <li>· Timeline not specified</li>
                  </ul>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Missing or unclear</p>
                  <ul className="space-y-1 text-white/80">
                    <li>· Permit responsibility</li>
                    <li>· Warranty details</li>
                    <li>· Cleanup & disposal</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h3 className="font-semibold text-white mb-4">Full review (unlocked)</h3>
              <ul className="space-y-2.5 text-sm text-white/80">
                {[
                  "Scope & materials audit",
                  "Timeline & milestones planner",
                  "Payment schedule recommendations",
                  "Cost breakdown intelligence",
                  "Download/share report",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckIcon className="h-4 w-4 text-white shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/start"
              className="inline-flex justify-center py-3.5 px-6 rounded-lg text-sm font-semibold text-black bg-white hover:bg-white/90 transition-colors"
            >
              Run my quote — free scan
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-neutral-950 py-16 md:py-20 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 text-center">
            How it works
          </h2>
          <p className="text-white/70 text-center mb-12 max-w-xl mx-auto">
            Run any contractor quote through QuoteShield. Free scan first; unlock the full review only if you want it.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { num: 1, title: "Upload your quote", desc: "PDF preferred. We’ll extract scope and pricing details." },
              { num: 2, title: "Get a free scan", desc: "See a risk score, top red flags, and what’s missing." },
              { num: 3, title: "Unlock full review (optional)", desc: "Pay once to unlock deeper recommendations and tools." },
              { num: 4, title: "Use the report to negotiate", desc: "Ask better questions and clarify terms before signing." },
            ].map((step) => (
              <div key={step.num} className="rounded-xl border border-white/10 bg-white/5 p-6">
                <span className="inline-flex w-9 h-9 rounded-full bg-white/20 text-white items-center justify-center text-sm font-bold mb-4">
                  {step.num}
                </span>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-sm text-white/50 text-center">
            Most users only pay once per project.
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-neutral-950 py-16 md:py-20 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-12 text-center">
            Simple, fair pricing
          </h2>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 flex flex-col">
              <h3 className="text-lg font-semibold text-white">Free Quote Scan</h3>
              <p className="mt-2 text-2xl font-bold text-white">$0</p>
              <ul className="mt-4 space-y-2.5 text-sm text-white/80 flex-1">
                {[
                  "Risk score with confidence level",
                  "Red flags preview",
                  "Missing or unclear info checklist",
                  "Questions to ask your contractor",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckIcon className="h-4 w-4 text-white/50 shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/start"
                className="mt-6 block w-full text-center py-3 px-4 rounded-lg text-sm font-semibold text-white border border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Free scan
              </Link>
            </div>

            <div className="rounded-xl border-2 border-white/20 bg-white/[0.06] p-6 flex flex-col relative">
              <span className="absolute -top-2.5 left-4 px-2 py-0.5 text-xs font-medium bg-white text-black rounded">
                Most popular
              </span>
              <h3 className="text-lg font-semibold text-white">Full Quote Review</h3>
              <p className="mt-2 text-2xl font-bold text-white">$39 <span className="text-sm font-normal text-white/50">per project</span></p>
              <ul className="mt-4 space-y-2.5 text-sm text-white/80 flex-1">
                {[
                  "Full scope & materials audit",
                  "Payment/deposit risk + suggested schedule",
                  "Timeline milestones",
                  "Negotiation guidance",
                  "Download/share report",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 mt-0.5">
                      <CheckIcon className="h-3 w-3 text-white" />
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/start"
                className="mt-6 block w-full text-center py-3 px-4 rounded-lg text-sm font-semibold text-black bg-white hover:bg-white/90 transition-colors"
              >
                Unlock full review
              </Link>
            </div>
          </div>

          <p className="mt-8 text-sm text-white/50 text-center max-w-md mx-auto">
            No subscription. Upgrade only when you need more.
          </p>
        </div>
      </section>

      {/* TRUST / FAQ */}
      <section className="bg-neutral-950 py-16 md:py-20 border-t border-white/5">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-white mb-4 text-center">
            Common questions
          </h2>
          <p className="text-white/60 text-sm text-center mb-8">
            Run your quote anytime — we’re here when you’re ready.
          </p>
          <dl className="space-y-8">
            <div>
              <dt className="font-semibold text-white">Do I need a subscription?</dt>
              <dd className="mt-2 text-white/70 text-sm leading-relaxed">
                No — most homeowners pay once per project.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">Is QuoteShield a contractor or legal service?</dt>
              <dd className="mt-2 text-white/70 text-sm leading-relaxed">
                No — we provide informational analysis to help you ask better questions.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">What if my quote is missing details?</dt>
              <dd className="mt-2 text-white/70 text-sm leading-relaxed">
                We’ll flag what’s missing and give you clear questions to send your contractor.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-neutral-950 py-16 md:py-20 border-t border-white/5">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Run your quote through QuoteShield
          </h2>
          <p className="text-white/60 text-sm mb-8">
            Get your risk score and red flags in minutes. No commitment until you’re ready for the full report.
          </p>
          <Link
            href="/start"
            className="inline-flex justify-center py-3.5 px-8 rounded-lg text-sm font-semibold text-black bg-white hover:bg-white/90 transition-colors"
          >
            Run my quote — free scan
          </Link>
          <p className="mt-5 text-xs text-white/50">
            Most homeowners only pay once per project.
          </p>
        </div>
      </section>
    </div>
  );
}
