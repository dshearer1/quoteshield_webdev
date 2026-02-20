import Link from "next/link";

const TOC_ITEMS = [
  { href: "#overview", label: "Overview" },
  { href: "#information-we-collect", label: "Information We Collect" },
  { href: "#how-we-use-information", label: "How We Use Information" },
  { href: "#quote-uploads", label: "Quote Uploads (PDFs / Photos)" },
  { href: "#payments", label: "Payments (Stripe)" },
  { href: "#ai-processing", label: "AI Processing (OpenAI)" },
  { href: "#database-storage", label: "Database & Storage (Supabase)" },
  { href: "#sharing", label: "Sharing of Information" },
  { href: "#cookies-analytics", label: "Cookies & Analytics" },
  { href: "#data-retention", label: "Data Retention" },
  { href: "#security", label: "Security" },
  { href: "#your-rights", label: "Your Choices & Rights" },
  { href: "#children", label: "Children's Privacy" },
  { href: "#changes", label: "Changes to This Policy" },
  { href: "#contact", label: "Contact Us" },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-2 text-white/60 text-sm">
          Last updated: February 10, 2026
        </p>
        <p className="mt-6 text-white/80 leading-relaxed">
          QuoteShield (&quot;QuoteShield,&quot; &quot;we,&quot; &quot;us,&quot; &quot;our&quot;) provides independent construction quote analysis so you can better understand pricing, scope, and risk before signing. This Privacy Policy explains what we collect, how we use it, and the choices you have.
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
              We collect only the information needed to operate QuoteShield, deliver your quote report, improve reliability, and keep the service secure. We do not sell your personal information.
            </p>
          </section>

          <section id="information-we-collect">
            <h2 className="text-xl font-semibold text-white mb-3">Information We Collect</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              We may collect the following categories of information:
            </p>
            <div className="space-y-4 text-white/80 text-sm leading-relaxed">
              <div>
                <strong className="text-white/90">1) Account information</strong>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Email address</li>
                  <li>User/account identifiers (e.g., user_id)</li>
                </ul>
              </div>
              <div>
                <strong className="text-white/90">2) Quote submission information</strong>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Project type and notes you provide</li>
                  <li>Uploaded quote documents (PDFs) and any images you upload</li>
                  <li>File metadata (e.g., upload timestamps, file paths)</li>
                  <li>Generated outputs (e.g., report JSON, report HTML, risk flags, and recommendations)</li>
                </ul>
              </div>
              <div>
                <strong className="text-white/90">3) Communications</strong>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Messages you send to support or business inquiry channels</li>
                </ul>
              </div>
              <div>
                <strong className="text-white/90">4) Technical and usage information</strong>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Device/browser information</li>
                  <li>IP address (typically for security, fraud prevention, and basic analytics)</li>
                  <li>App usage events (e.g., pages visited, feature clicks), collected through analytics tools</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="how-we-use-information">
            <h2 className="text-xl font-semibold text-white mb-3">How We Use Information</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed">
              <li>Provide and operate the service (upload, process, and generate your quote report)</li>
              <li>Maintain your dashboard and allow you to access your reports</li>
              <li>Process payments and confirm purchase status</li>
              <li>Provide customer support and respond to requests</li>
              <li>Improve product quality, accuracy, and user experience (often in aggregated form)</li>
              <li>Detect, prevent, and investigate fraud, abuse, and security incidents</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section id="quote-uploads">
            <h2 className="text-xl font-semibold text-white mb-3">Quote Uploads (PDFs / Photos)</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              When you upload a contractor quote, we store the file to generate your report and make it available to you in your account.
            </p>
            <p className="text-white/80 leading-relaxed mb-3">
              <strong className="text-white/90">Important notes:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed">
              <li>Your uploads and reports are not shared with contractors by default.</li>
              <li>Please avoid uploading highly sensitive personal information (e.g., Social Security numbers, bank details). If such information is included in a quote document, it may be processed as part of generating your report.</li>
            </ul>
          </section>

          <section id="payments">
            <h2 className="text-xl font-semibold text-white mb-3">Payments (Stripe)</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              We use Stripe to process payments. QuoteShield does not store full payment card numbers. Stripe may collect and process your payment information according to Stripe&apos;s own privacy practices.
            </p>
            <p className="text-white/80 leading-relaxed">
              We may store limited payment-related details such as: Stripe session IDs, payment intent IDs, and payment status timestamps (e.g., paid_at). These help us confirm your purchase, provide receipts, and prevent fraud.
            </p>
          </section>

          <section id="ai-processing">
            <h2 className="text-xl font-semibold text-white mb-3">AI Processing (OpenAI)</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              To generate quote analysis and recommendations, we may send extracted text from your uploaded documents and relevant context (such as project type and notes) to our AI service provider (e.g., OpenAI).
            </p>
            <p className="text-white/80 leading-relaxed mb-3">
              We use AI processing to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed mb-4">
              <li>Extract and summarize important quote details</li>
              <li>Identify missing items and potential risks</li>
              <li>Generate structured analysis and homeowner-friendly recommendations</li>
            </ul>
            <p className="text-white/80 leading-relaxed">
              <strong className="text-white/90">Data minimization:</strong> We aim to send only the information necessary to produce the analysis. We recommend you avoid submitting documents containing highly sensitive personal data whenever possible.
            </p>
          </section>

          <section id="database-storage">
            <h2 className="text-xl font-semibold text-white mb-3">Database & Storage (Supabase)</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              We use Supabase to store:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed mb-4">
              <li>Account identifiers and authentication-related data</li>
              <li>Submission records and report outputs (e.g., report_json, report_html)</li>
              <li>File references/paths and timestamps</li>
            </ul>
            <p className="text-white/80 leading-relaxed">
              We use Supabase Storage (or equivalent storage) to securely store uploaded PDFs/photos. Access is restricted and designed to allow only authorized access through the application.
            </p>
          </section>

          <section id="sharing">
            <h2 className="text-xl font-semibold text-white mb-3">Sharing of Information</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              We do not sell your personal information.
            </p>
            <p className="text-white/80 leading-relaxed mb-3">
              We may share information with trusted service providers strictly to operate QuoteShield, such as:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed mb-4">
              <li>Payment processing (Stripe)</li>
              <li>Database and storage (Supabase)</li>
              <li>AI processing providers (e.g., OpenAI)</li>
              <li>Hosting and monitoring providers</li>
              <li>Analytics providers (e.g., Vercel Analytics or similar)</li>
            </ul>
            <p className="text-white/80 leading-relaxed">
              We may also disclose information if required to: comply with law, legal process, or governmental request; protect the rights, safety, and security of QuoteShield, our users, or the public; or prevent fraud or abuse.
            </p>
          </section>

          <section id="cookies-analytics">
            <h2 className="text-xl font-semibold text-white mb-3">Cookies & Analytics</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              We use cookies and similar technologies to: keep you signed in and maintain session security; remember basic preferences; and understand how the product is used (analytics).
            </p>
            <p className="text-white/80 leading-relaxed mb-3">
              <strong className="text-white/90">Analytics:</strong> We use analytics to understand usage patterns (e.g., page visits and feature interactions) so we can improve performance and usability. Analytics data may be collected through first-party and/or third-party tools.
            </p>
            <p className="text-white/80 leading-relaxed">
              You can control cookies through your browser settings. If you disable cookies, some features (like login/session) may not work correctly.
            </p>
          </section>

          <section id="data-retention">
            <h2 className="text-xl font-semibold text-white mb-3">Data Retention</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              We retain your information for as long as necessary to: provide the service and maintain your account; comply with legal obligations; and resolve disputes and enforce agreements.
            </p>
            <p className="text-white/80 leading-relaxed">
              You may request deletion of your account or specific submissions. Some information may be retained where required for legal, security, or fraud-prevention purposes.
            </p>
          </section>

          <section id="security">
            <h2 className="text-xl font-semibold text-white mb-3">Security</h2>
            <p className="text-white/80 leading-relaxed">
              We use reasonable administrative, technical, and organizational safeguards designed to protect your information. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section id="your-rights">
            <h2 className="text-xl font-semibold text-white mb-3">Your Choices & Rights</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              Depending on your location, you may have rights to: access the personal information we hold about you; request correction of inaccurate information; request deletion of your information; or object to or restrict certain processing.
            </p>
            <p className="text-white/80 leading-relaxed">
              To make a request, contact us at support@quoteshield.com. We may need to verify your identity before fulfilling certain requests.
            </p>
          </section>

          <section id="children">
            <h2 className="text-xl font-semibold text-white mb-3">Children&apos;s Privacy</h2>
            <p className="text-white/80 leading-relaxed">
              QuoteShield is not intended for children under 13, and we do not knowingly collect personal information from children. If you believe a child has provided us personal information, contact us and we will take steps to delete it.
            </p>
          </section>

          <section id="changes">
            <h2 className="text-xl font-semibold text-white mb-3">Changes to This Policy</h2>
            <p className="text-white/80 leading-relaxed">
              We may update this Privacy Policy from time to time. If we make material changes, we will update the &quot;Last updated&quot; date and may provide additional notice in the app.
            </p>
          </section>

          <section id="contact">
            <h2 className="text-xl font-semibold text-white mb-3">Contact Us</h2>
            <p className="text-white/80 leading-relaxed mb-3">
              Questions about this Privacy Policy or your data?
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm leading-relaxed">
              <li><strong className="text-white/90">Support:</strong> support@quoteshield.com</li>
              <li><strong className="text-white/90">Business inquiries:</strong> use <Link href="/business-contact" className="text-white underline hover:no-underline">/business-contact</Link> (or business@quoteshield.com if available)</li>
            </ul>
          </section>
        </article>

        <div className="mt-12 p-6 rounded-xl border border-white/10 bg-white/5">
          <h3 className="text-base font-semibold text-white mb-2">We don&apos;t sell your data.</h3>
          <p className="text-sm text-white/80 leading-relaxed">
            QuoteShield does not sell personal information. We only share data with service providers required to operate the platform (payments, storage, AI processing, analytics).
          </p>
        </div>

      </div>
    </div>
  );
}
