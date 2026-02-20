import React from "react";

export default function Field({
  label,
  hint,
  children,
  dark,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div>
      <label className={`block text-sm font-medium mb-1 ${dark ? "text-white/80" : "text-black"}`}>
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {hint ? (
        <p className={`mt-2 text-xs ${dark ? "text-white/50" : "text-gray-500"}`}>{hint}</p>
      ) : null}
    </div>
  );
}
