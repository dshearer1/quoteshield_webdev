import Link from "next/link";

const TOC_ITEMS = [
  { href: "#informational-use", label: "Informational use only" },
  { href: "#no-advice", label: "No legal or contractor advice" },
  { href: "#accuracy", label: "Accuracy & limitations" },
  { href: "#user-responsibility", label: "User responsibility" },
  { href: "#negotiation", label: "Negotiation suggestions" },
  { href: "#uploads", label: "Uploaded documents" },
  { href: "#liability", label: "Limitation of liability" },
  { href: "#changes", label: "Changes to this disclaimer" },
  { href: "#contact", label: "Contact" },
];

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Disclaimer
        </h1>
        <p className="mt-2 text-white/60 text-sm">
          Last updated: February 10, 2026
        </p>
        <p className="mt-6 text-white/80 leading-relaxed">
          QuoteShield provides informational analysis to help homeowners better understand construction quotes. This Disclaimer explains the limits of our service and how our reports should be used.
        </p>

        <div className="mt-10 rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-base font-semibold text-white mb-2">Important</h2>
          <p className="text-sm text-white/80 leading-relaxed">
            QuoteShield helps you understand quotes — it does not replace professional judgment. Always verify details in writing with your contractor before signing.
          </p>
        </div>

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

        <article className="mt-12 space-y-10">
          <section id="informational-use">
            <h2 className="text-xl font-semibold text-white mb-3">Informational use only</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              QuoteShield provides informational analysis only.
            </p>
            <p className="text-white/80 leading-relaxed mb-3">We are not:</p>
            <ul className="list-disc pl-5 space-y-2 text-white/80 text-sm leading-relaxed mb-4">
              <li>A law firm</li>
              <li>A licensed contractor</li>
              <li>A home inspector</li>
              <li>An engineer</li>
              <li>A substitute for professional advice</li>
            </ul>
            <p className="text-white/80 leading-relaxed">
              Our reports are intended to help you understand pricing, scope, missing details, and potential risks — not to make decisions for you.
            </p>
          </section>

          <section id="no-advice">
            <h2 className="text-xl font-semibold text-white mb-3">No legal or contractor advice</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              QuoteShield does not provide legal, engineering, or contractor advice.
            </p>
            <p className="text-white/80 leading-relaxed mb-3">
              Nothing on the platform, including reports, recommendations, risk flags, or negotiation suggestions:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/80 text-sm leading-relaxed mb-4">
              <li>Creates a professional-client relationship</li>
              <li>Replaces advice from licensed professionals</li>
              <li>Guarantees compliance with local codes, permits, or regulations</li>
            </ul>
            <p className="text-white/80 leading-relaxed">
              Always review your contract carefully and consult qualified professionals when appropriate.
            </p>
          </section>

          <section id="accuracy">
            <h2 className="text-xl font-semibold text-white mb-3">Accuracy & limitations</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              QuoteShield analyzes information based on:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/80 text-sm leading-relaxed mb-4">
              <li>The documents you upload</li>
              <li>The information included in those documents</li>
              <li>Automated and human-assisted analysis processes</li>
            </ul>
            <p className="text-white/80 leading-relaxed mb-3">
              Because construction quotes vary widely by contractor, region, materials, and timing:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/80 text-sm leading-relaxed">
              <li>We cannot guarantee that every issue or omission will be identified</li>
              <li>Pricing benchmarks and recommendations are estimates</li>
              <li>Contractors may interpret or price work differently</li>
            </ul>
          </section>

          <section id="user-responsibility">
            <h2 className="text-xl font-semibold text-white mb-3">User responsibility</h2>
            <p className="text-white/80 leading-relaxed mb-3">You are responsible for:</p>
            <ul className="list-disc pl-5 space-y-2 text-white/80 text-sm leading-relaxed mb-4">
              <li>Verifying quote details directly with your contractor</li>
              <li>Confirming scope, materials, timelines, warranties, and payment terms</li>
              <li>Obtaining required permits and inspections</li>
              <li>Deciding whether to proceed with a project</li>
            </ul>
            <p className="text-white/80 leading-relaxed">
              QuoteShield does not control contractor behavior or project outcomes.
            </p>
          </section>

          <section id="negotiation">
            <h2 className="text-xl font-semibold text-white mb-3">Negotiation suggestions</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              Any negotiation suggestions provided by QuoteShield:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/80 text-sm leading-relaxed mb-4">
              <li>Are optional talking points</li>
              <li>Do not guarantee contractor agreement or savings</li>
              <li>Should be used at your discretion</li>
            </ul>
            <p className="text-white/80 leading-relaxed">
              Contractors are not obligated to accept or respond to negotiation requests.
            </p>
          </section>

          <section id="uploads">
            <h2 className="text-xl font-semibold text-white mb-3">Uploaded documents</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              QuoteShield processes uploaded documents to generate reports.
            </p>
            <p className="text-white/80 leading-relaxed">
              Please avoid uploading highly sensitive personal information (such as Social Security numbers or full financial account details). If such information appears in a quote, it may be processed as part of the analysis.
            </p>
          </section>

          <section id="liability">
            <h2 className="text-xl font-semibold text-white mb-3">Limitation of liability</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              To the maximum extent permitted by law:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/80 text-sm leading-relaxed mb-4">
              <li>QuoteShield is not responsible for decisions you make based on the report</li>
              <li>QuoteShield is not liable for contractor performance, pricing disputes, delays, or workmanship</li>
              <li>QuoteShield does not guarantee savings or project outcomes</li>
            </ul>
            <p className="text-white/80 leading-relaxed">
              Your use of QuoteShield is at your own discretion and risk.
            </p>
          </section>

          <section id="changes">
            <h2 className="text-xl font-semibold text-white mb-3">Changes to this disclaimer</h2>
            <p className="text-white/80 leading-relaxed">
              We may update this Disclaimer from time to time. If we make changes, we will update the &quot;Last updated&quot; date at the top of this page.
            </p>
          </section>

          <section id="contact">
            <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              If you have questions about this Disclaimer:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/80 text-sm leading-relaxed">
              <li><strong className="text-white/90">Support:</strong> support@quoteshield.com</li>
              <li><strong className="text-white/90">Business inquiries:</strong> <Link href="/business-contact" className="text-white underline hover:no-underline">/business-contact</Link></li>
            </ul>
          </section>
        </article>

      </div>
    </div>
  );
}
