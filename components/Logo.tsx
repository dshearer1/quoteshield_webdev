import React from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: "light" | "dark";
}

export default function Logo({
  className = "",
  showText = true,
  variant = "dark",
}: LogoProps) {
  const colorClass =
    variant === "light" ? "text-white" : "text-black";

  return (
    <svg
      viewBox="0 0 540 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`h-9 w-auto ${colorClass} ${className}`}
      aria-hidden
    >
      {/* Shield */}
      <path
        d="M48 8 L80 20 V48 C80 66 64 80 48 88 C32 80 16 66 16 48 V20 L48 8Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Quote lines */}
      <line x1="32" y1="36" x2="64" y2="36" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="32" y1="48" x2="64" y2="48" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="32" y1="60" x2="52" y2="60" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />

      {/* Text */}
      {showText && (
        <text
          x="112"
          y="62"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="58"
          fontWeight="600"
          fill="currentColor"
          letterSpacing="-0.5"
        >
          QuoteShield
        </text>
      )}
    </svg>
  );
}
