import React from "react";

export default function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={["rounded-2xl border border-gray-200 bg-white p-6 shadow-sm", className].join(" ")}>
      {children}
    </div>
  );
}
