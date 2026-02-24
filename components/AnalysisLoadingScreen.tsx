"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Line items identified",
  "Pricing compared to local benchmarks",
  "Scope reviewed for completeness",
  "Labor and materials evaluated",
  "Risk factors assessed",
  "Pricing confidence calculated",
];

const STEP_INTERVAL_MS = 2500;

interface AnalysisLoadingScreenProps {
  /** When true, all steps complete and we transition out */
  isComplete?: boolean;
  /** Called after completion animation, before unmount */
  onTransitionComplete?: () => void;
}

export default function AnalysisLoadingScreen({
  isComplete = false,
  onTransitionComplete,
}: AnalysisLoadingScreenProps) {
  const [completedSteps, setCompletedSteps] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Prevent back navigation during analysis
  useEffect(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    window.history.pushState(null, "", url);
    const handlePopState = () => {
      if (!isComplete && !isTransitioning) {
        window.history.pushState(null, "", url);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isComplete, isTransitioning]);

  // Sequential step progression
  useEffect(() => {
    if (isComplete) {
      setCompletedSteps(STEPS.length);
      setVisibleSteps(STEPS.length);
      return;
    }
    const t = setInterval(() => {
      setVisibleSteps((v) => Math.min(v + 1, STEPS.length));
      setCompletedSteps((c) => Math.min(c + 1, STEPS.length));
    }, STEP_INTERVAL_MS);
    return () => clearInterval(t);
  }, [isComplete]);

  // When complete: show all checkmarks 800ms, fade out 400ms, then callback
  useEffect(() => {
    if (!isComplete || completedSteps < STEPS.length) return;
    const t1 = setTimeout(() => setIsTransitioning(true), 800);
    const t2 = setTimeout(() => onTransitionComplete?.(), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isComplete, completedSteps, onTransitionComplete]);

  const progress = (completedSteps / STEPS.length) * 100;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950 px-6 transition-opacity duration-[400ms] ease-out ${
        isTransitioning ? "opacity-0" : "opacity-100"
      }`}
      role="status"
      aria-live="polite"
      aria-label="Running your quote analysis"
    >
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold text-white">Running your quote analysis</h1>
        <p className="mt-2 text-sm text-white/70">
          Reviewing pricing, scope, and market benchmarks.
        </p>
        <p className="mt-1 text-xs text-white/45">Typically completes in about 15 seconds.</p>

        <div className="mt-10 space-y-3 text-left">
          {STEPS.map((label, i) => {
            const isVisible = i < visibleSteps;
            const isDone = i < completedSteps;
            return (
              <div
                key={label}
                className={`flex items-center gap-3 transition-all duration-500 ${
                  isVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                    isDone
                      ? "border-white/30 bg-white/10"
                      : "border-white/20 bg-white/5"
                  }`}
                >
                  {isDone ? (
                    <svg
                      className="h-3.5 w-3.5 text-white/80"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className="h-1.5 w-1.5 rounded-full bg-white/30 animate-pulse" />
                  )}
                </div>
                <span
                  className={`text-sm transition-colors duration-300 ${
                    isDone ? "text-white/90" : "text-white/60"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress bar — subtle, premium, restrained */}
        <div className="mt-8 h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-white/20 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
