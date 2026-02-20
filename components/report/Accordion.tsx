"use client";

import { useState } from "react";

export function Accordion({
  title,
  children,
  defaultOpen = false,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm font-medium text-white"
      >
        {title}
        <span className="shrink-0 text-white/50" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      {open && <div className="pb-2 pt-0">{children}</div>}
    </div>
  );
}
