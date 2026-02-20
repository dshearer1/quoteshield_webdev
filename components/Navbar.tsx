"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import Logo from "./Logo";
import NavProfileMenu from "./NavProfileMenu";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    const setSession = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setIsLoggedIn(!!session?.user);
      });
    };
    setSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => setSession());
    return () => subscription.unsubscribe();
  }, []);

  const showLoggedInNav = isLoggedIn === true;

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800/80 bg-neutral-950 shadow-[0_1px_0_0_rgba(255,255,255,0.04)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href={showLoggedInNav ? "/dashboard" : "/"}
          className="flex shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 rounded"
        >
          <Logo variant="light" className="h-8 w-auto sm:h-9" />
        </Link>

        <nav className="flex items-center">
          {showLoggedInNav ? (
            <>
              <Link
                href="/dashboard/milestones"
                className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-800/60 hover:text-white"
              >
                Milestones
              </Link>
              <NavProfileMenu />
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  href="/how-it-works"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-800/60 hover:text-white"
                >
                  How it works
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-800/60 hover:text-white"
                >
                  Pricing
                </Link>
                <Link
                  href="/signin"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-800/60 hover:text-white"
                >
                  Login
                </Link>
              </div>
              <Link
                href="/start"
                className="ml-4 sm:ml-6 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                Run my quote
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
