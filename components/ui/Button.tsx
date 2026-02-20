"use client";

import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "default" | "inverted" | "ghost";
};

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function Button({ className = "", loading, disabled, variant = "default", children, ...props }: ButtonProps) {
  const isDisabled = disabled || loading;
  const variantStyles =
    variant === "inverted"
      ? "rounded-lg bg-white text-black px-4 py-2.5 hover:bg-white/90"
      : variant === "ghost"
        ? "rounded-lg border border-white/20 bg-transparent text-white px-4 py-2.5 hover:bg-white/10"
        : "rounded-2xl bg-black px-4 py-3 text-white hover:bg-gray-900";

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={[
        "group inline-flex w-full items-center justify-center gap-2 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed",
        variantStyles,
        className,
      ].join(" ")}
    >
      {loading ? (
        <>
          <Spinner />
          <span>{variant === "inverted" ? "Continue…" : "Redirecting…"}</span>
        </>
      ) : (
        <>
          {children}
          {variant !== "ghost" && (
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          )}
        </>
      )}
    </button>
  );
}
