import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="border-t border-neutral-800/80 bg-neutral-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-10 md:grid-cols-[1.2fr_auto_auto_auto] md:gap-12">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 rounded">
              <Logo variant="light" className="h-8 w-auto" />
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-400">
              Independent construction quote analysis. Understand pricing, scope, and red flags before you sign.
            </p>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Support
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/support" className="text-sm text-neutral-400 transition hover:text-white">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="/billing" className="text-sm text-neutral-400 transition hover:text-white">
                  Billing & Payments
                </Link>
              </li>
              <li>
                <Link href="/business-contact" className="text-sm text-neutral-400 transition hover:text-white">
                  Business
                </Link>
              </li>
            </ul>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Product
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/start" className="text-sm text-neutral-400 transition hover:text-white">
                  Free scan
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-sm text-neutral-400 transition hover:text-white">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-neutral-400 transition hover:text-white">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-sm text-neutral-400 transition hover:text-white">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-neutral-400 transition hover:text-white">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="text-sm text-neutral-400 transition hover:text-white">
                  Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-neutral-800/80 text-center">
          <p className="text-xs text-neutral-500">
            © {new Date().getFullYear()} QuoteShield. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
