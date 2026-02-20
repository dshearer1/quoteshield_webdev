export default function StepsCard({ dark }: { dark?: boolean }) {
  const items = [
    "Free scan after you upload your quote",
    "Unlock full review when ready (Stripe)",
    "Report delivered by secure link",
    "Typical turnaround: 24–48 hours after unlock",
  ];

  if (dark) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">
          How it works
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-white/80">
          {items.map((t) => (
            <li key={t} className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" aria-hidden />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs text-white/70">
            <strong className="font-medium text-white/90">Tip:</strong> Scanned PDFs may show lower confidence; we’ll still extract what we can.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        How it works
      </h2>
      <ul className="mt-4 space-y-3 text-sm text-neutral-700">
        {items.map((t) => (
          <li key={t} className="flex gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" aria-hidden />
            <span>{t}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-xl border border-neutral-100 bg-neutral-50/80 px-4 py-3">
        <p className="text-xs text-neutral-600">
          <strong className="font-medium text-neutral-700">Tip:</strong> Scanned PDFs may show lower confidence; we’ll still extract what we can.
        </p>
      </div>
    </div>
  );
}
