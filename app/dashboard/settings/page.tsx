"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import { getOrCreateProfile } from "@/lib/profile";
import SettingsCard from "@/components/SettingsCard";
import ToggleRow from "@/components/ToggleRow";

export default function DashboardSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [profileSaveState, setProfileSaveState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [notifSaveState, setNotifSaveState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [emailReportReady, setEmailReportReady] = useState(true);
  const [emailProductUpdates, setEmailProductUpdates] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [textNotifications, setTextNotifications] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) window.location.href = "/signin";
          return;
        }
        const profile = await getOrCreateProfile(supabase, session.user.id, {
          full_name: session.user?.user_metadata?.full_name ?? session.user?.user_metadata?.name ?? null,
        });
        const em = session.user?.email ?? "";
        if (!cancelled) {
          setFullName(profile?.full_name ?? "");
          setEmail(em);
          setEmailReportReady(profile?.email_report_ready ?? true);
          setEmailProductUpdates(profile?.email_product_updates ?? false);
          setPhoneNumber(profile?.phone_number ?? "");
          setTextNotifications(profile?.text_notifications ?? false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaveState("loading");
    try {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setProfileSaveState("error");
        setTimeout(() => setProfileSaveState("idle"), 3000);
        return;
      }
      await getOrCreateProfile(supabase, session.user.id);
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() || null })
        .eq("id", session.user.id);
      if (error) throw error;
      setProfileSaveState("success");
      setTimeout(() => setProfileSaveState("idle"), 3000);
    } catch {
      setProfileSaveState("error");
      setTimeout(() => setProfileSaveState("idle"), 3000);
    }
  }

  async function handlePasswordReset() {
    // Stub: no auth logic change
    window.alert("Password reset flow would run here (stub).");
  }

  async function handleNotifSave(e: React.FormEvent) {
    e.preventDefault();
    setNotifSaveState("loading");
    try {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setNotifSaveState("error");
        setTimeout(() => setNotifSaveState("idle"), 3000);
        return;
      }
      await getOrCreateProfile(supabase, session.user.id);
      const { error } = await supabase
        .from("profiles")
        .update({
          email_report_ready: emailReportReady,
          email_product_updates: emailProductUpdates,
          phone_number: phoneNumber.trim() || null,
          text_notifications: textNotifications,
        })
        .eq("id", session.user.id);
      if (error) throw error;
      setNotifSaveState("success");
      setTimeout(() => setNotifSaveState("idle"), 3000);
    } catch {
      setNotifSaveState("error");
      setTimeout(() => setNotifSaveState("idle"), 3000);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50">
      <div className="mx-auto max-w-[1000px] px-6 py-8 sm:py-10">
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Account Settings</h1>
        <p className="mt-1 text-sm text-gray-600">Manage your account preferences.</p>

        <div className="mt-10 space-y-8">
          {/* Profile */}
          <SettingsCard title="Profile">
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Full name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600"
                  aria-readonly="true"
                />
                <p className="mt-1 text-xs text-gray-500">Email cannot be changed here.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={profileSaveState === "loading"}
                  className="rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-60 w-full sm:w-auto"
                >
                  {profileSaveState === "loading" ? "Saving…" : "Save changes"}
                </button>
                {profileSaveState === "success" && (
                  <span className="text-sm font-medium text-green-600">Saved.</span>
                )}
                {profileSaveState === "error" && (
                  <span className="text-sm font-medium text-red-600">Something went wrong.</span>
                )}
              </div>
            </form>
          </SettingsCard>

          {/* Security */}
          <SettingsCard title="Security">
            <div className="space-y-6">
              <div>
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 w-full sm:w-auto"
                >
                  Send password reset email
                </button>
                <p className="mt-2 text-xs text-gray-500">
                  We’ll email you a secure link to reset your password.
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-6">
                <div>
                  <p className="text-sm font-medium text-gray-900">Two-factor authentication</p>
                  <p className="text-xs text-gray-500">Extra security for your account</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  Coming soon
                </span>
              </div>
            </div>
          </SettingsCard>

          {/* Notifications */}
          <SettingsCard title="Notifications">
            <form onSubmit={handleNotifSave} className="space-y-4">
              <div className="divide-y divide-gray-100">
                <ToggleRow
                  label="Email me when a report is ready"
                  checked={emailReportReady}
                  onChange={setEmailReportReady}
                />
                <ToggleRow
                  label="Product updates (occasional)"
                  checked={emailProductUpdates}
                  onChange={setEmailProductUpdates}
                />
              </div>
              <div className="pt-2">
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                  Phone number (for text notifications)
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                  placeholder="+1 234 567 8900"
                  autoComplete="tel"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Add your number if you want to receive text alerts (e.g. when your report is ready).
                </p>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <ToggleRow
                  label="Send me text notifications"
                  checked={textNotifications}
                  onChange={setTextNotifications}
                />
                {textNotifications && !phoneNumber.trim() && (
                  <p className="mt-1 text-xs text-amber-600">
                    Enter a phone number above to receive texts.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={notifSaveState === "loading"}
                  className="rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-60 w-full sm:w-auto"
                >
                  {notifSaveState === "loading" ? "Saving…" : "Save preferences"}
                </button>
                {notifSaveState === "success" && (
                  <span className="text-sm font-medium text-green-600">Saved.</span>
                )}
                {notifSaveState === "error" && (
                  <span className="text-sm font-medium text-red-600">Something went wrong.</span>
                )}
              </div>
            </form>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}
