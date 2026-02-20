"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseBrowser";

import UploadDropzone from "@/components/UploadDropzone";
import PriceCard from "@/components/PriceCard";
import Stepper from "@/components/Stepper";

import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

const PROJECT_TYPES = [
  "Roofing",
  "Siding",
  "Windows",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Concrete",
  "Remodel",
  "Other",
];

const PROPERTY_TYPES = [
  "Single-family home",
  "Townhome / Duplex",
  "Multi-family",
  "Commercial",
];

const PROJECT_SIZE_ROOFING = [
  "Under 15 squares (~1,500 sq ft roof)",
  "15–30 squares",
  "30+ squares",
  "Not sure",
];

const SPECIAL_CONDITIONS_OPTIONS = [
  "Insurance claim involved",
  "Active leak / emergency repair",
  "Steep roof or complex layout",
  "Full tear-off included",
  "Urgent timeline",
];

const ROOF_MATERIALS = [
  "Asphalt shingles",
  "Metal",
  "Tile",
  "Flat / TPO",
  "Not sure",
];

const HOME_HEIGHTS = [
  "1 story",
  "2 story",
  "3+ story",
  "Not sure",
];

const NOTES_QUICK_TAGS = [
  "Insurance job",
  "Leak damage",
  "HOA restrictions",
  "Solar panels",
  "Multiple layers",
  "Wood rot suspected",
];

/** Extract ZIP from stored address (handles "35242", "City, ST 35242", etc.) */
function extractZipFromAddress(addr: string | null): string {
  if (!addr || !addr.trim()) return "";
  const match = addr.match(/\d{5}(?:-\d{4})?/);
  return match ? match[0] : addr.trim();
}

/** Build project_notes from all optional fields. */
function buildProjectNotes(
  propertyType: string,
  projectSize: string,
  specialConditions: string[],
  roofMaterial: string,
  homeHeight: string,
  userNotes: string
): string {
  const lines: string[] = [];
  if (propertyType.trim()) lines.push(`Property type: ${propertyType.trim()}`);
  if (projectSize.trim()) lines.push(`Project size: ${projectSize.trim()}`);
  if (specialConditions.length > 0) lines.push(`Special conditions: ${specialConditions.join(", ")}`);
  if (roofMaterial.trim()) lines.push(`Roof material: ${roofMaterial.trim()}`);
  if (homeHeight.trim()) lines.push(`Home height: ${homeHeight.trim()}`);
  if (userNotes.trim()) lines.push(userNotes.trim());
  return lines.join("\n");
}

export default function StartPage() {
  const searchParams = useSearchParams();
  const submissionIdFromUrl = searchParams.get("submissionId") ?? searchParams.get("submission_id");
  const projectIdFromUrl = searchParams.get("project_id");
  const quoteTypeFromUrl = searchParams.get("type");

  const [step, setStep] = useState(1);
  const [submissionId, setSubmissionId] = useState<string | null>(() => submissionIdFromUrl);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [alreadyComplete, setAlreadyComplete] = useState(false);
  const [hasFileFromDraft, setHasFileFromDraft] = useState(false);

  // Step 1
  const [projectType, setProjectType] = useState("Roofing");
  const [zip, setZip] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [projectSize, setProjectSize] = useState("");
  const [specialConditions, setSpecialConditions] = useState<string[]>([]);

  // Step 2
  const [file, setFile] = useState<File | null>(null);
  const [roofMaterial, setRoofMaterial] = useState("");
  const [homeHeight, setHomeHeight] = useState("");
  const [projectValue, setProjectValue] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [projectNotes, setProjectNotes] = useState("");

  // Step 3
  const [email, setEmail] = useState("");
  const [customerName, setCustomerName] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [attemptedStep1, setAttemptedStep1] = useState(false);
  const [attemptedStep2, setAttemptedStep2] = useState(false);
  const [attemptedStep3, setAttemptedStep3] = useState(false);

  const zipOk = useMemo(() => /^\d{5}(-\d{4})?$/.test(zip.trim()), [zip]);
  const emailOk = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);

  const step1Valid =
    projectType.trim() !== "" &&
    zipOk &&
    propertyType.trim() !== "" &&
    projectSize.trim() !== "";

  const step2Valid = !!file;
  const step3Valid = emailOk && (!!file || (!!submissionId && hasFileFromDraft));

  useEffect(() => {
    let cancelled = false;
    createBrowserClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        if (session?.user?.email) {
          setEmail(session.user.email);
          setIsLoggedIn(true);
        }
        setSessionChecked(true);
      })
      .catch(() => {
        if (!cancelled) setSessionChecked(true);
      });
    return () => { cancelled = true; };
  }, []);

  const loadDraft = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/submissions/draft?submissionId=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400 && data.error === "Not a draft") setAlreadyComplete(true);
        return;
      }
      setEmail(data.email ?? "");
      setProjectType(data.project_type || "Roofing");
      setCustomerName(data.customer_name ?? "");
      setContractorName(data.contractor_name ?? "");
      setProjectValue(data.project_value != null ? String(data.project_value) : "");
      setZip(extractZipFromAddress(data.address ?? null));
      const notes = data.project_notes ?? "";
      const ptMatch = notes.match(/Property type:\s*(.+?)(?=\n|$)/i);
      const psMatch = notes.match(/Project size:\s*(.+?)(?=\n|$)/i);
      const scMatch = notes.match(/Special conditions:\s*(.+?)(?=\n|$)/i);
      const rmMatch = notes.match(/Roof material:\s*(.+?)(?=\n|$)/i);
      const hhMatch = notes.match(/Home height:\s*(.+?)(?=\n|$)/i);
      if (ptMatch) setPropertyType(ptMatch[1].trim());
      if (psMatch) setProjectSize(psMatch[1].trim());
      if (scMatch) setSpecialConditions(scMatch[1].split(",").map((s) => s.trim()).filter(Boolean));
      if (rmMatch) setRoofMaterial(rmMatch[1].trim());
      if (hhMatch) setHomeHeight(hhMatch[1].trim());
      const rest = notes
        .replace(/\n?Property type:.*(?=\n|$)/gi, "\n")
        .replace(/\n?Project size:.*(?=\n|$)/gi, "\n")
        .replace(/\n?Special conditions:.*(?=\n|$)/gi, "\n")
        .replace(/\n?Roof material:.*(?=\n|$)/gi, "\n")
        .replace(/\n?Home height:.*(?=\n|$)/gi, "\n")
        .replace(/\n+/g, "\n")
        .trim();
      setProjectNotes(rest);
      setSubmissionId(data.submissionId ?? id);
      setHasFileFromDraft(!!data.hasFile);
      if (data.hasFile) setStep(3);
      else if (data.contractor_name || data.project_value) setStep(3);
      else setStep(2);
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!submissionIdFromUrl || draftLoaded) return;
    loadDraft(submissionIdFromUrl);
  }, [submissionIdFromUrl, draftLoaded, loadDraft]);

  function onPickFile(f: File | null) {
    setErr(null);
    setFileErr(null);
    if (!f) return setFile(null);
    if (f.type !== "application/pdf") {
      setFile(null);
      return setFileErr("Please upload a PDF file.");
    }
    if (f.size > 20 * 1024 * 1024) {
      setFile(null);
      return setFileErr("PDF is too large (max 20MB).");
    }
    setFile(f);
  }

  function handleStep1Next(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setAttemptedStep1(true);
    if (!step1Valid) return;
    setStep(2);
  }

  function handleStep2Next(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setAttemptedStep2(true);
    if (!file) return;
    setStep(3);
  }

  async function handleStep3Submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setAttemptedStep3(true);
    if (!emailOk) return setErr("Please enter a valid email.");
    if (!file && !(submissionId && hasFileFromDraft))
      return setErr("Please upload a PDF quote.");
    setLoading(true);
    try {
      let effectiveSubmissionId = submissionId;
      if (!effectiveSubmissionId) {
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
        const body: Record<string, unknown> = {
          project_type: projectType,
          address: zip.trim(),
          email: email.trim().toLowerCase(),
          customer_name: customerName.trim() || undefined,
        };
        if (projectIdFromUrl) body.project_id = projectIdFromUrl;
        if (quoteTypeFromUrl === "revised" || quoteTypeFromUrl === "comparison") body.quote_type = quoteTypeFromUrl;
        const res = await fetch("/api/submissions/create-draft", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "Failed to create draft");
        effectiveSubmissionId = data.submissionId;
        setSubmissionId(effectiveSubmissionId);
      }

      const enrichedNotes = buildProjectNotes(
        propertyType,
        projectSize,
        specialConditions,
        roofMaterial,
        homeHeight,
        projectNotes
      );
      await fetch("/api/submissions/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: effectiveSubmissionId,
          fields: {
            email: email.trim().toLowerCase(),
            customer_name: customerName.trim() || null,
            contractor_name: contractorName.trim() || null,
            project_value: projectValue.trim() ? Number(projectValue.replace(/,/g, "")) : null,
            project_notes: enrichedNotes.trim() || null,
            address: zip.trim() || null,
          },
        }),
      });

      if (file) {
        const formData = new FormData();
        formData.append("submissionId", effectiveSubmissionId);
        formData.append("file", file);
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = {};
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
        const uploadRes = await fetch("/api/submissions/upload", {
          method: "POST",
          headers,
          body: formData,
        });
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) throw new Error(uploadData?.error ?? "Upload failed");

        const params = new URLSearchParams({ submissionId: effectiveSubmissionId });
        if (uploadData?.duplicateDetected && uploadData?.previousToken) {
          params.set("duplicate", "1");
          params.set("previousToken", uploadData.previousToken);
        }
        window.location.href = `/start/scan?${params.toString()}`;
      } else {
        window.location.href = `/start/scan?submissionId=${encodeURIComponent(effectiveSubmissionId)}`;
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  const canProceedStep2 = !!file && !loading;
  const canProceedStep3 = (!!file || (!!submissionId && hasFileFromDraft)) && emailOk && !loading;

  if (alreadyComplete) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-white">This review is already complete</h1>
          <p className="mt-2 text-white/70">You can open it from your dashboard.</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white text-black px-4 py-2.5 text-sm font-semibold hover:bg-white/90 transition"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16 lg:max-w-5xl">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Start a review</h1>
        <p className="mt-4 text-white/80 leading-relaxed">
          Answer a few questions to benchmark pricing in your area.
        </p>
        <div className="mt-8">
          <Stepper
            dark
            current={step}
            steps={["Project details", "Quote details", "Delivery"]}
          />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <section className="p-6 rounded-xl border border-white/10 bg-white/5 flex flex-col">
              {step === 1 && (
                <form onSubmit={handleStep1Next} className="flex flex-col">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-white">Project details</h2>
                    <p className="mt-0.5 text-sm text-white/60">Used to benchmark your quote accurately.</p>
                    <div className="mt-3 flex gap-2">
                      <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/70">Required</span>
                      <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/50">Optional (improves accuracy)</span>
                    </div>
                    <p className="mt-3 text-xs text-white/50">Required fields are marked *</p>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <Field dark label="Project type *" hint="Required for pricing comparison.">
                        <Select
                          dark
                          value={projectType}
                          onChange={(e) => setProjectType(e.target.value)}
                          required
                        >
                          {PROJECT_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </Select>
                      </Field>

                      <Field dark label="Project ZIP code *" hint="Used to compare local labor and material rates.">
                        <Input
                          dark
                          placeholder="e.g. 35242"
                          value={zip}
                          onChange={(e) => setZip(e.target.value)}
                          maxLength={10}
                        />
                      </Field>
                    </div>
                    {attemptedStep1 && !zipOk && zip.length > 0 && (
                      <p className="mt-1 text-xs text-red-400">Enter a valid 5-digit ZIP.</p>
                    )}

                    <div className="mt-5">
                      <Field dark label="Property type *" hint="Impacts labor and permit expectations.">
                        <div className="mt-2 space-y-2" role="radiogroup" aria-label="Property type">
                          {PROPERTY_TYPES.map((opt) => (
                            <label
                              key={opt}
                              className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2.5 text-sm transition hover:bg-neutral-700 has-[:checked]:border-neutral-500 has-[:checked]:ring-1 has-[:checked]:ring-neutral-500"
                            >
                              <input
                                type="radio"
                                name="propertyType"
                                value={opt}
                                checked={propertyType === opt}
                                onChange={() => setPropertyType(opt)}
                                className="h-4 w-4 border-neutral-500 bg-neutral-800 text-white focus:ring-neutral-500"
                              />
                              <span className="text-white/90">{opt}</span>
                            </label>
                          ))}
                        </div>
                      </Field>
                      {attemptedStep1 && !propertyType.trim() && (
                        <p className="mt-1 text-xs text-red-400">Select a property type.</p>
                      )}
                    </div>

                    <div className="mt-5">
                      <Field dark label="Approximate project size *" hint="Improves price-per-square accuracy.">
                        <div className="mt-2 space-y-2" role="radiogroup" aria-label="Project size">
                          {(projectType === "Roofing" ? PROJECT_SIZE_ROOFING : ["Under 15 squares (~1,500 sq ft roof)", "15–30 squares", "30+ squares", "Not sure"]).map((opt) => (
                            <label
                              key={opt}
                              className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2.5 text-sm transition hover:bg-neutral-700 has-[:checked]:border-neutral-500 has-[:checked]:ring-1 has-[:checked]:ring-neutral-500"
                            >
                              <input
                                type="radio"
                                name="projectSize"
                                value={opt}
                                checked={projectSize === opt}
                                onChange={() => setProjectSize(opt)}
                                className="h-4 w-4 border-neutral-500 bg-neutral-800 text-white focus:ring-neutral-500"
                              />
                              <span className="text-white/90">{opt}</span>
                            </label>
                          ))}
                        </div>
                      </Field>
                      {attemptedStep1 && !projectSize.trim() && (
                        <p className="mt-1 text-xs text-red-400">Select a size (or Not sure).</p>
                      )}
                    </div>

                    <div className="mt-5 pt-5 border-t border-white/10">
                      <p className="text-xs font-medium uppercase tracking-wider text-white/50 mb-3">Optional (improves accuracy)</p>
                      <Field dark label="Special conditions (optional — improves accuracy)" hint="These can affect cost and scheduling.">
                    <div className="mt-2 space-y-2" role="group">
                      {SPECIAL_CONDITIONS_OPTIONS.map((opt) => (
                        <label
                          key={opt}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2.5 text-sm transition hover:bg-neutral-700 has-[:checked]:border-neutral-500 has-[:checked]:ring-1 has-[:checked]:ring-neutral-500"
                        >
                          <input
                            type="checkbox"
                            checked={specialConditions.includes(opt)}
                            onChange={() => {
                              setSpecialConditions((prev) =>
                                prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]
                              );
                            }}
                            className="h-4 w-4 rounded border-neutral-500 bg-neutral-800 text-white focus:ring-neutral-500"
                          />
                          <span className="text-white/90">{opt}</span>
                        </label>
                      ))}
                    </div>
                      </Field>
                    </div>
                  </div>

                  <div className="mt-8 pt-5 border-t border-white/10 flex justify-end">
                    {err && <p className="mr-4 self-center text-sm text-red-400" role="alert">{err}</p>}
                    <Button type="submit" variant="inverted" loading={loading} disabled={!step1Valid}>
                      Next →
                    </Button>
                  </div>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleStep2Next} className="flex flex-col">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-white">Quote details</h2>
                    <p className="mt-0.5 text-sm text-white/60">Upload your quote so we can review scope and pricing.</p>
                    <div className="mt-3 flex gap-2">
                      <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/70">Required</span>
                      <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/50">Optional (improves accuracy)</span>
                    </div>
                    <p className="mt-3 text-xs text-white/50">Required fields are marked *</p>

                    <div className="mt-5">
                      <Field dark label="Upload quote PDF *" hint="Required for analysis.">
                        <UploadDropzone dark file={file} onPickFile={onPickFile} error={fileErr} />
                      </Field>
                      {attemptedStep2 && !file && !(submissionId && hasFileFromDraft) && (
                        <p className="mt-1 text-xs text-red-400">Upload a PDF to continue.</p>
                      )}
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <Field dark label="Roof material (if known) — Optional (improves accuracy)" hint="Improves material pricing comparison.">
                        <Select dark value={roofMaterial} onChange={(e) => setRoofMaterial(e.target.value)}>
                          <option value="">Select…</option>
                          {ROOF_MATERIALS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </Select>
                      </Field>

                      <Field dark label="Home height — Optional (improves accuracy)" hint="Impacts labor and safety costs.">
                        <Select dark value={homeHeight} onChange={(e) => setHomeHeight(e.target.value)}>
                          <option value="">Select…</option>
                          {HOME_HEIGHTS.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </Select>
                      </Field>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <Field dark label="Quoted project total (optional)" hint="Helps flag major pricing gaps faster.">
                        <Input
                          dark
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 18,500"
                          value={projectValue}
                          onChange={(e) => setProjectValue(e.target.value.replace(/[^0-9,]/g, ""))}
                        />
                      </Field>

                      <Field dark label="Contractor name (optional)" hint="Used for market comparison insights.">
                        <Input dark placeholder="Company name" value={contractorName} onChange={(e) => setContractorName(e.target.value)} />
                      </Field>
                    </div>

                    <div className="mt-5">
                      <Field dark label="Anything we should know? (optional)" hint="Short notes only.">
                        <textarea
                          value={projectNotes}
                          onChange={(e) => setProjectNotes(e.target.value)}
                          placeholder="Damage details, access limits, HOA, permits, etc."
                          rows={3}
                          className="w-full rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2.5 text-sm !text-white placeholder:text-neutral-400 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500/20 resize-y"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          {NOTES_QUICK_TAGS.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setProjectNotes((n) => (n ? `${n}; ${tag}` : tag))}
                              className="rounded-full border border-neutral-600 bg-neutral-800 px-3 py-1.5 text-xs text-white/90 hover:bg-white/15 hover:border-white/20 transition"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>
                      </Field>
                    </div>
                  </div>

                  <div className="mt-8 pt-5 border-t border-white/10 flex justify-between items-center">
                    {err && <p className="text-sm text-red-400" role="alert">{err}</p>}
                    <div className="flex gap-3 ml-auto">
                      <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={loading}>
                        Back
                      </Button>
                      <Button type="submit" variant="inverted" loading={loading} disabled={!canProceedStep2}>
                        Next →
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={handleStep3Submit} className="flex flex-col">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-white">Get your free scan</h2>
                    <p className="mt-0.5 text-sm text-white/60">We&apos;ll email a secure link when it&apos;s ready.</p>
                    <div className="mt-3 flex gap-2">
                      <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/70">Required</span>
                      <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/50">Optional (improves accuracy)</span>
                    </div>

                    <div className="mt-5 space-y-5">
                      <Field dark label="Email address *" hint="We'll send your report link here.">
                        <Input
                          dark
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="you@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          readOnly={!!isLoggedIn && sessionChecked}
                          disabled={!!isLoggedIn && sessionChecked}
                        />
                      </Field>
                      {attemptedStep3 && !emailOk && (
                        <p className="mt-1 text-xs text-red-400">Enter a valid email.</p>
                      )}

                      <Field dark label="Your name (optional)">
                        <Input
                          dark
                          placeholder="First name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                        />
                      </Field>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-white/50">
                      <span>Secure link delivery</span>
                      <span className="text-white/30">·</span>
                      <span>No subscription</span>
                      <span className="text-white/30">·</span>
                      <span>Powered by Stripe</span>
                    </div>

                    <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                      <h3 className="text-sm font-medium text-white/80">What happens next</h3>
                      <ul className="mt-2 space-y-1.5 text-sm text-white/60">
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-400/80">1.</span> We scan your PDF
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-400/80">2.</span> You get a free summary
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-400/80">3.</span> Unlock the full review if you want it
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 pt-5 border-t border-white/10 flex flex-col items-center">
                    {err && <p className="mb-3 text-sm text-red-400" role="alert">{err}</p>}
                    <Button type="submit" variant="inverted" loading={loading} disabled={!canProceedStep3} className="w-full sm:w-auto">
                      Get my free scan →
                    </Button>
                    <p className="mt-3 text-center text-xs text-white/50">
                      Free scan first. Unlock full review if you want the full breakdown.
                    </p>
                  </div>
                </form>
              )}
            </section>
            <p className="mt-6 text-center text-xs text-white/50">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="text-white/80 underline hover:text-white">Terms</Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-white/80 underline hover:text-white">Privacy Policy</Link>.
            </p>
          </div>
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-8">
              <PriceCard dark />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
