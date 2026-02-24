function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function PriceCard({ dark, dimmed }: { dark?: boolean; dimmed?: boolean }) {
  const bullets = [
    "Full scope audit & red flags",
    "Line-by-line pricing insights",
    "Timeline review",
    "Negotiation checklist",
  ];

  if (dark) {
    return (
      <div
        className={
          dimmed
            ? "rounded-xl bg-white/[0.03] p-6"
            : "rounded-xl border border-white/10 bg-white/5 p-6"
        }
      >
        <div className={dimmed ? "flex flex-col" : "flex items-baseline justify-between gap-2"}>
          {dimmed ? (
            <>
              <span className="text-xs font-medium text-white/50">Unlock full review</span>
              <span className="mt-1 text-2xl font-bold text-white">$39</span>
            </>
          ) : (
            <span className="text-sm font-medium text-white/50">Unlock full review — $39</span>
          )}
        </div>
        <p className={dimmed ? "mt-3 text-xs text-white/45" : "mt-2 text-xs text-white/60"}>
          Free scan included. No subscription.
        </p>
        <p className={dimmed ? "mt-4 text-[11px] font-medium uppercase tracking-wider text-white/35" : "mt-4 text-xs font-semibold uppercase tracking-wider text-white/50"}>
          Includes
        </p>
        <ul className={dimmed ? "mt-2 space-y-1.5" : "mt-2 space-y-2"}>
          {bullets.map((t) => (
            <li
              key={t}
              className={
                dimmed
                  ? "flex items-center gap-2 text-sm text-white/50"
                  : "flex items-center gap-2.5 text-sm text-white/80"
              }
            >
              <span
                className={
                  dimmed
                    ? "flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/[0.08]"
                    : "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20"
                }
              >
                <CheckIcon className={dimmed ? "h-2.5 w-2.5 text-white/50" : "h-3 w-3 text-white"} />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-neutral-500">Unlock full review — $39</span>
      </div>
      <p className="mt-2 text-xs text-neutral-600">
        Free scan included. No subscription.
      </p>
      <p className="mt-4 text-xs font-medium text-neutral-500">Includes</p>
      <ul className="mt-2 space-y-2">
        {bullets.map((t) => (
          <li key={t} className="flex items-center gap-2.5 text-sm text-neutral-700">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900">
              <CheckIcon className="h-3 w-3 text-white" />
            </span>
            {t}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] text-neutral-500">
        Typical turnaround: instant after payment.
      </p>
    </div>
  );
}
