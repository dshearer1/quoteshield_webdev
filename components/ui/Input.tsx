"use client";

import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
  dark?: boolean;
};

export default function Input({ className = "", error, dark, ...props }: InputProps) {
  const base = "w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:outline-none focus:ring-1";
  const light = error
    ? "border-red-300 focus:border-red-400 focus:ring-red-400/40 text-gray-900 placeholder:text-gray-500"
    : "border-gray-200 focus:border-gray-400 focus:ring-black/10 text-gray-900 placeholder:text-gray-500";
  const darkStyles = error
    ? "border-red-400/60 bg-neutral-800 !text-white placeholder:text-neutral-400 focus:border-red-400 focus:ring-red-400/40"
    : "border-neutral-600 bg-neutral-800 !text-white placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-neutral-500/20";
  return (
    <input
      {...props}
      className={[base, dark ? darkStyles : light, className].join(" ")}
      style={dark ? { color: "rgb(255 255 255)", backgroundColor: "rgb(38 38 38)" } : undefined}
    />
  );
}
