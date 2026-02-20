"use client";

import React from "react";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  dark?: boolean;
};

const ChevronDown = ({ dark }: { dark?: boolean }) => (
  <svg
    className={`pointer-events-none h-4 w-4 shrink-0 ${dark ? "text-white/60" : "text-neutral-500"}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

export default function Select({ className = "", dark, ...props }: SelectProps) {
  const inputBase = "w-full appearance-none rounded-lg border py-2.5 pl-3 pr-10 text-sm outline-none transition focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60";
  const inputLight =
    "border-neutral-200 bg-white text-neutral-900 focus:border-neutral-400 focus:ring-neutral-900/10 hover:border-neutral-300 [&>option]:bg-white [&>option]:text-neutral-900";
  const inputDark =
    "border-neutral-600 bg-neutral-800 !text-white focus:border-neutral-500 focus:ring-neutral-500/20 [&>option]:bg-neutral-800 [&>option]:!text-white";
  return (
    <div className="relative w-full">
      <select
        {...props}
        className={[inputBase, dark ? inputDark : inputLight, className].join(" ")}
        style={dark ? { color: "rgb(255 255 255)", backgroundColor: "rgb(38 38 38)" } : undefined}
      />
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <ChevronDown dark={dark} />
      </div>
    </div>
  );
}
