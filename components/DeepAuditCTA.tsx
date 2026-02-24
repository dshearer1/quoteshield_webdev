"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";

export interface DeepAuditCTAProps {
  price: number;
  onUnlock: () => void | Promise<void>;
  unlockLoading?: boolean;
  unlockError?: string | null;
  secondaryLinkText: string;
  secondaryLinkHref: string;
}

export default function DeepAuditCTA({
  price,
  onUnlock,
  unlockLoading = false,
  unlockError = null,
  secondaryLinkText,
  secondaryLinkHref,
}: DeepAuditCTAProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 sm:p-8 md:p-10">
      <div className="grid gap-8 md:grid-cols-[1fr_300px] md:items-start">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/50">
            ROOFING COST & CONTRACT DEEP AUDIT
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white md:text-3xl">
            Unlock the full cost breakdown
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-white/70 leading-relaxed">
            Get a deeper audit that quantifies pricing, highlights risk areas, and gives you ready-to-use negotiation language.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-white/85">
            <li className="flex gap-3">
              <span className="text-emerald-400 shrink-0">✓</span>
              <span>Validate local market pricing</span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 shrink-0">✓</span>
              <span>Identify potential overcharges</span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 shrink-0">✓</span>
              <span>Get a negotiation script you can use</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-5 md:p-6">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold text-white">${price}</span>
            <span className="text-white/60">One-time</span>
          </div>
          <p className="mt-2 text-sm text-white/55">
            Delivered immediately after purchase.
          </p>
          <div className="mt-6">
            <Button
              className="w-full"
              variant="inverted"
              loading={unlockLoading}
              disabled={unlockLoading}
              onClick={onUnlock}
            >
              Unlock Deep Audit
            </Button>
          </div>
          {unlockError && (
            <p className="mt-2 text-sm text-red-400" role="alert">
              {unlockError}
            </p>
          )}
          {secondaryLinkText && (
            <div className="mt-4">
              <Link
                href={secondaryLinkHref}
                className="text-sm text-white/60 hover:text-white/80 transition"
              >
                {secondaryLinkText}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
