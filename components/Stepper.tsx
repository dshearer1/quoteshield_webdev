export default function Stepper({
  current,
  steps,
  dark,
  minimal,
}: {
  current: number; // 1-based
  steps: string[];
  dark?: boolean;
  minimal?: boolean;
}) {
  const progressPct =
    steps.length > 1 ? ((current - 1) / (steps.length - 1)) * 100 : 0;

  const trackClass = dark ? "bg-white/10" : "bg-neutral-100";
  const fillClass = dark ? "bg-white" : "bg-neutral-900";
  const trackHeight = minimal ? "h-px" : "h-0.5";
  const doneCircle = dark
    ? "border-white bg-white text-neutral-950"
    : "border-neutral-900 bg-neutral-900 text-white";
  const activeCircle = dark
    ? "border-white bg-neutral-950 text-white"
    : "border-neutral-900 bg-white text-neutral-900";
  const inactiveCircle = dark
    ? minimal
      ? "border-white/20 bg-transparent text-white/40"
      : "border-white/30 bg-transparent text-white/40"
    : "border-neutral-200 bg-white text-neutral-400";
  const doneLabel = dark ? "text-white/80" : "text-neutral-600";
  const activeLabel = dark ? "text-white" : "text-neutral-900";
  const inactiveLabel = dark ? (minimal ? "text-white/40" : "text-white/40") : "text-neutral-400";

  const wrapperClass = minimal
    ? dark
      ? "rounded-lg bg-white/[0.03]"
      : "rounded-lg bg-neutral-50"
    : dark
      ? "rounded-xl border border-white/10 bg-white/5"
      : "rounded-xl border border-neutral-200/80 bg-white shadow-sm";

  return (
    <div className={wrapperClass}>
      <div className={minimal ? "px-4 py-4 sm:px-6" : "px-4 py-3 sm:px-6"}>
        <div className="relative flex justify-between">
          <div
            className={`absolute left-3 right-3 top-1/2 -translate-y-1/2 ${trackHeight} ${trackClass}`}
            aria-hidden
          >
            <div
              className={`h-full transition-all duration-300 ease-out ${fillClass}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {steps.map((label, idx) => {
            const stepNum = idx + 1;
            const done = stepNum < current;
            const active = stepNum === current;

            return (
              <div
                key={label}
                className="relative z-10 flex flex-col items-center"
              >
                <div
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors",
                    done ? doneCircle : active ? activeCircle : inactiveCircle,
                  ].join(" ")}
                >
                  {done ? (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 6l3 3 5-6" />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={[
                    "mt-2 text-center text-xs font-medium",
                    done ? doneLabel : active ? activeLabel : inactiveLabel,
                  ].join(" ")}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
