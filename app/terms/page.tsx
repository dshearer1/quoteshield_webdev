import Link from "next/link";

const TOC_ITEMS = [
  { href: "#overview", label: "Overview" },
  { href: "#eligibility", label: "Eligibility & Accounts" },
  { href: "#service", label: "The Service" },
  { href: "#informational-disclaimer", label: "Informational Use & Disclaimer" },
  { href: "#uploads", label: "User Content (Uploads)" },
  { href: "#payments", label: "Payments & Refunds" },
  { href: "#delivery", label: "Report Access & Delivery" },
  { href: "#acceptable-use", label: "Acceptable Use" },
  { href: "#ip", label: "Intellectual Property" },
  { href: "#third-party", label: "Third-Party Services" },
  { href: "#termination", label: "Suspension & Termination" },
  { href: "#disclaimers", label: "Disclaimers" },
  { href: "#liability", label: "Limitation of Liability" },
  { href: "#indemnification", label: "Indemnification" },
  { href: "#changes", label: "Changes to the Service or Terms" },
  { href: "#law", label: "Governing Law" },
  { href: "#contact", label: "Contact Us" },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Terms of Service
        </h1>
        <p className="mt-2 text-white/60 text-sm">
          Last updated: February 10, 2026
        </p>
        <p className="mt-6 text-white/80 leading-relaxed">
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of QuoteShield (&quot;QuoteShield,&quot; &quot;we,&quot; &quot;us,&quot; &quot;our&quot;). By creating an account, purchasing a review, or using the service, you agree to these Terms.
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

        <article className="mt-12 space-y-10">
          <section id="overview">
            <h2 className="text-xl font-semibold text-white mb-3">Overview</h2>
            <p className="text-white/80 leading-relaxed">
              QuoteShield provides independent construction quote analysis intended to help you understand pricing, scope, missing items, and potential risks before you sign with a contractor.
            </p>
          </section>

          <section id="eligibility">
            <h2 className="text-xl font-semibold text-white mb-3">Eligibility & Accounts</h2>
            <ul className="list-disc pl-5 space-y-2 text-white/80 text-sm leading-relaxed">
              <li>You must be at least 18 years old to use QuoteShield.</li>
              <li>You are responsible for maintaining the confidentiality of your account and login credentials.</li>
              <li>You agree to provide accurate information and keep your account details up to date.</li>
            </ul>
          </section>

          <section id="service">
            <h2 className="text-xl font-semibold text-white mb-3">The Service</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              When you submit a quote for review, QuoteShield may:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed mb-4">
              <li>Extract text and key details from your uploaded documents</li>
              <li>Generate a structured report with findings (e.g., scope checks, red flags, questions to ask, negotiation suggestions)</li>
              <li>Provide homeowner-friendly recommendations</li>
            </ul>
            <p className="text-white/80 leading-relaxed">
              We may update, improve, or change the service over time.
            </p>
          </section>

          <section id="informational-disclaimer">
            <h2 className="text-xl font-semibold text-white mb-3">Informational Use & Disclaimer</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              <strong className="text-white/90">IMPORTANT:</strong> QuoteShield provides informational analysis only.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed mb-4">
              <li>We are not a law firm and do not provide legal advice.</li>
              <li>We are not a licensed contractor, engineer, or home inspector.</li>
              <li>Our reports are not a substitute for professional advice, inspections, permits, or contract review.</li>
            </ul>
            <p className="text-white/80 leading-relaxed mb-3">
              You are responsible for:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed">
              <li>Verifying all quote details with your contractor</li>
              <li>Reviewing and understanding your contract terms</li>
              <li>Obtaining any required permits and inspections</li>
              <li>Deciding whether to proceed with a project</li>
            </ul>
            <div className="mt-6 p-6 rounded-xl border border-white/10 bg-white/5">
              <h3 className="text-base font-semibold text-white mb-2">Informational analysis only</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                QuoteShield does not provide legal or contractor services. Verify details with your contractor and written contract.
              </p>
            </div>
          </section>

          <section id="uploads">
            <h2 className="text-xl font-semibold text-white mb-3">User Content (Uploads)</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              &quot;User Content&quot; includes the documents, photos, text, and information you upload or submit.
            </p>
            <p className="text-white/80 leading-relaxed mb-3">
              You represent and warrant that:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed mb-4">
              <li>You have the right to upload the content</li>
              <li>Your uploads do not violate any laws or third-party rights</li>
            </ul>
            <p className="text-white/80 leading-relaxed mb-3">
              You agree not to upload:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed mb-4">
              <li>Highly sensitive personal data (e.g., Social Security numbers, bank account numbers) unless absolutely necessary</li>
              <li>Illegal or harmful content</li>
            </ul>
            <p className="text-white/80 leading-relaxed">
              We may store your uploads and generated reports to provide the service. See our <Link href="/privacy" className="text-white underline hover:no-underline">Privacy Policy</Link> for details on data handling.
            </p>
          </section>

          <section id="payments">
            <h2 className="text-xl font-semibold text-white mb-3">Payments & Refunds</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              Payments are processed through Stripe.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed mb-4">
              <li>Prices are shown at checkout.</li>
              <li>Taxes may apply depending on your location (if applicable).</li>
              <li>We do not store full payment card details.</li>
            </ul>
            <p className="text-white/80 leading-relaxed mb-3">
              <strong className="text-white/90">Refunds:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed">
              <li>If a report cannot be generated due to a technical failure on our side, contact support and we will work to fix the issue or provide an appropriate refund.</li>
              <li>If the report is successfully generated and delivered, refunds are not guaranteed (because the service has been performed), but we may review requests case-by-case.</li>
            </ul>
          </section>

          <section id="delivery">
            <h2 className="text-xl font-semibold text-white mb-3">Report Access & Delivery</h2>
            <ul className="list-disc pl-5 space-y-2 text-white/80 text-sm leading-relaxed">
              <li>After payment, your report is generated and made available in your dashboard (and may be accessible via a private link).</li>
              <li>You are responsible for keeping your report link confidential.</li>
              <li>We may limit access if we detect abuse or unauthorized sharing.</li>
            </ul>
          </section>

          <section id="acceptable-use">
            <h2 className="text-xl font-semibold text-white mb-3">Acceptable Use</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              You agree not to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed mb-4">
              <li>Attempt to reverse engineer or misuse the platform</li>
              <li>Upload malware or attempt to disrupt the service</li>
              <li>Scrape or copy the service at scale</li>
              <li>Use QuoteShield for unlawful purposes</li>
              <li>Share private report links publicly or sell access to reports</li>
            </ul>
            <p className="text-white/80 leading-relaxed">
              We may investigate and take action for violations.
            </p>
          </section>

          <section id="ip">
            <h2 className="text-xl font-semibold text-white mb-3">Intellectual Property</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              QuoteShield and its software, design, and branding are owned by QuoteShield and protected by intellectual property laws.
            </p>
            <p className="text-white/80 leading-relaxed mb-3">
              You may use your report for personal purposes.
            </p>
            <p className="text-white/80 leading-relaxed">
              You may not reproduce, resell, or distribute QuoteShield&apos;s templates, systems, or analysis methods as a competing product.
            </p>
          </section>

          <section id="third-party">
            <h2 className="text-xl font-semibold text-white mb-3">Third-Party Services</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              QuoteShield relies on third-party services to operate, including:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed mb-4">
              <li>Stripe (payments)</li>
              <li>Supabase (authentication, database, storage)</li>
              <li>AI processing providers (e.g., OpenAI)</li>
              <li>Hosting/analytics providers</li>
            </ul>
            <p className="text-white/80 leading-relaxed">
              Your use of those services may be subject to their terms and policies.
            </p>
          </section>

          <section id="termination">
            <h2 className="text-xl font-semibold text-white mb-3">Suspension & Termination</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              We may suspend or terminate your access if:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed mb-4">
              <li>You violate these Terms</li>
              <li>We suspect fraud, abuse, or unauthorized access</li>
              <li>Required by law or security reasons</li>
            </ul>
            <p className="text-white/80 leading-relaxed">
              You may stop using the service at any time. You may request account deletion via support.
            </p>
          </section>

          <section id="disclaimers">
            <h2 className="text-xl font-semibold text-white mb-3">Disclaimers</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              The service is provided &quot;AS IS&quot; and &quot;AS AVAILABLE.&quot;
            </p>
            <p className="text-white/80 leading-relaxed mb-3">
              We do not guarantee:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed mb-4">
              <li>That the report will identify every issue in a quote</li>
              <li>That contractors will respond or negotiate</li>
              <li>That using QuoteShield will result in savings</li>
            </ul>
            <p className="text-white/80 leading-relaxed">
              Construction pricing and quality vary widely by region, contractor, materials, and timing.
            </p>
          </section>

          <section id="liability">
            <h2 className="text-xl font-semibold text-white mb-3">Limitation of Liability</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              To the maximum extent permitted by law:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/80 text-sm leading-relaxed">
              <li>QuoteShield will not be liable for indirect, incidental, special, consequential, or punitive damages</li>
              <li>QuoteShield&apos;s total liability for any claim related to the service will not exceed the amount you paid for the specific quote review giving rise to the claim</li>
            </ul>
          </section>

          <section id="indemnification">
            <h2 className="text-xl font-semibold text-white mb-3">Indemnification</h2>
            <p className="text-white/80 leading-relaxed">
              You agree to indemnify and hold harmless QuoteShield from claims arising out of: your uploads or misuse of the service; your violation of these Terms; or your interactions with contractors or third parties.
            </p>
          </section>

          <section id="changes">
            <h2 className="text-xl font-semibold text-white mb-3">Changes to the Service or Terms</h2>
            <p className="text-white/80 leading-relaxed">
              We may update the service, pricing, or these Terms from time to time. If we make material changes, we will update the &quot;Last updated&quot; date and may provide additional notice in the app.
            </p>
          </section>

          <section id="law">
            <h2 className="text-xl font-semibold text-white mb-3">Governing Law</h2>
            <p className="text-white/80 leading-relaxed">
              These Terms are governed by the laws of the United States and the state/jurisdiction where QuoteShield is based, without regard to conflict-of-law rules.
            </p>
          </section>

          <section id="contact">
            <h2 className="text-xl font-semibold text-white mb-3">Contact Us</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              Questions about these Terms?
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed">
              <li><strong className="text-white/90">Support:</strong> support@quoteshield.com</li>
              <li><strong className="text-white/90">Business inquiries:</strong> <Link href="/business-contact" className="text-white underline hover:no-underline">/business-contact</Link></li>
            </ul>
          </section>
        </article>

      </div>
    </div>
  );
}
