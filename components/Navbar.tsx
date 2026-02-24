"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import Logo from "./Logo";
import NavProfileMenu from "./NavProfileMenu";

const WORKFLOW_PREFIXES = ["/start", "/start-review", "/r/", "/claim", "/pay/success"];

function isWorkflowRoute(pathname: string): boolean {
  return WORKFLOW_PREFIXES.some((prefix) => {
    if (pathname === prefix) return true;
    if (prefix.endsWith("/")) return pathname.startsWith(prefix);
    return pathname.startsWith(`${prefix}/`);
  });
}

export default function Navbar() {
  const pathname = usePathname();
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

  const isWorkflow = pathname ? isWorkflowRoute(pathname) : false;
  const showLoggedInNav = isLoggedIn === true;

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800/80 bg-neutral-950 shadow-[0_1px_0_0_rgba(255,255,255,0.04)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href={isWorkflow ? "/" : showLoggedInNav ? "/dashboard" : "/"}
          className="flex shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 rounded"
        >
          <Logo variant="light" className="h-8 w-auto sm:h-9" />
        </Link>

        <nav className="flex items-center">
          {isWorkflow ? (
            /* Workflow mode: Logo + Create Account (ghost) + Sign In, or user menu */
            showLoggedInNav ? (
              <NavProfileMenu />
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/start"
                  className="rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/5 hover:border-white/30"
                >
                  Create Account
                </Link>
                <Link
                  href="/signin"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
                >
                  Sign In
                </Link>
              </div>
            )
          ) : showLoggedInNav ? (
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
                className="ml-4 sm:ml-6 inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                Analyze My Quote
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
