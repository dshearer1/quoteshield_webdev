"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseBrowser";

function useInitials() {
  const [initials, setInitials] = useState("?");
  useEffect(() => {
    (async () => {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const part = user.email.split("@")[0];
        setInitials(part.slice(0, 2).toUpperCase());
      } else if (user?.user_metadata?.full_name) {
        const names = String(user.user_metadata.full_name).trim().split(/\s+/);
        setInitials(
          names.length >= 2
            ? (names[0][0] + names[names.length - 1][0]).toUpperCase()
            : names[0].slice(0, 2).toUpperCase()
        );
      }
    })();
  }, []);
  return initials;
}

export default function NavProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const initials = useInitials();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-600 bg-neutral-800 text-sm font-medium text-white transition hover:bg-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-lg border border-neutral-700 bg-neutral-900 py-1 shadow-xl">
          <Link
            href="/dashboard/settings"
            className="block px-4 py-2.5 text-sm text-neutral-200 hover:bg-neutral-800 hover:text-white"
            onClick={() => setOpen(false)}
          >
            Account Settings
          </Link>
          <Link
            href="/dashboard/billing"
            className="block px-4 py-2.5 text-sm text-neutral-200 hover:bg-neutral-800 hover:text-white"
            onClick={() => setOpen(false)}
          >
            Billing
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full px-4 py-2.5 text-left text-sm text-neutral-200 hover:bg-neutral-800 hover:text-white"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
