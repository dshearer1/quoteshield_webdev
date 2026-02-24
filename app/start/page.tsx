"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseBrowser";

import UploadDropzone from "@/components/UploadDropzone";
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

const PROPERTY_CLASS_OPTIONS = ["Residential", "Commercial", "Not sure"];

const ROOFING_JOB_TYPES = ["Repair", "Full replacement", "Not sure"];
const SIDING_JOB_TYPES = ["Partial", "Full", "Not sure"];
const SIDING_MATERIALS = ["Vinyl", "Fiber cement", "Wood", "Other", "Not sure"];
const WINDOW_COUNT_OPTIONS = ["1–5", "6–10", "11–20", "21+", "Not sure"];
const WINDOW_SCOPE_OPTIONS = ["Whole home", "Partial", "Not sure"];
const HVAC_SCOPE_OPTIONS = ["Replace", "New install", "Not sure"];
const HVAC_SYSTEM_TYPES = ["Central split", "Package", "Mini-split", "Not sure"];
const PLUMBING_SCOPE_OPTIONS = ["Repair", "Replace", "Install", "Not sure"];
const ELECTRICAL_SCOPE_OPTIONS = ["Repair", "Panel upgrade", "Rewire", "New install", "Not sure"];
const CONCRETE_TYPES = ["Driveway", "Patio", "Walkway", "Slab", "Foundation", "Other"];
const REMODEL_AREAS = ["Kitchen", "Bath", "Flooring", "Paint", "Full", "Other"];

/** Quick Question config: ask only if benchmark data missing or low confidence (we use Step 1 empty / "Not sure" as proxy). Max 2 per session. */
type QuickQuestionOption = string;
interface QuickQuestionDef {
  id: string;
  question: string;
  options: QuickQuestionOption[];
  step1Key: string;
  /** If set, use this to decide if we need to ask (current value from Step 1). */
  getCurrentValue: (ctx: QuickQuestionContext) => string;
}
interface QuickQuestionContext {
  roofingJobType: string;
  insuranceClaim: string;
  sidingJobType: string;
  sidingMaterialKnown: string;
  windowCountEst: string;
  windowScope: string;
  hvacScope: string;
  hvacSystemType: string;
  plumbingScope: string;
  electricalScope: string;
  concreteType: string;
  remodelArea: string;
  otherDescription: string;
}

const QUICK_QUESTIONS: Record<string, QuickQuestionDef[]> = {
  Roofing: [
    { id: "roof_scope", question: "Is this a repair or full replacement?", options: ["Repair", "Full replacement", "Not sure"], step1Key: "Roofing job type", getCurrentValue: (c) => c.roofingJobType },
    { id: "roof_insurance", question: "Is this an insurance claim?", options: ["Yes", "No", "Not sure"], step1Key: "Insurance claim", getCurrentValue: (c) => c.insuranceClaim },
  ],
  Siding: [
    { id: "siding_scope", question: "Is this partial repair or full replacement?", options: ["Partial repair", "Full replacement", "Not sure"], step1Key: "Siding job type", getCurrentValue: (c) => c.sidingJobType },
    { id: "siding_material", question: "What material (if known)?", options: ["Vinyl", "Fiber cement", "Wood", "Other", "Not sure"], step1Key: "Siding material", getCurrentValue: (c) => c.sidingMaterialKnown },
  ],
  Windows: [
    { id: "windows_count", question: "How many windows are being replaced?", options: ["1–5", "6–10", "11–20", "21+", "Not sure"], step1Key: "Window count", getCurrentValue: (c) => c.windowCountEst },
    { id: "windows_scope", question: "Is this whole home or partial?", options: ["Whole home", "Partial", "Not sure"], step1Key: "Window scope", getCurrentValue: (c) => c.windowScope },
  ],
  HVAC: [
    { id: "hvac_type", question: "What type of system is this?", options: ["Central split", "Package unit", "Mini-split", "Not sure"], step1Key: "HVAC system type", getCurrentValue: (c) => c.hvacSystemType },
    { id: "hvac_scope", question: "Is this a replacement or new install?", options: ["Replace existing", "New install", "Not sure"], step1Key: "HVAC scope", getCurrentValue: (c) => c.hvacScope },
  ],
  Plumbing: [
    { id: "plumbing_scope", question: "What best describes the job?", options: ["Repair", "Replace", "New install", "Not sure"], step1Key: "Plumbing scope", getCurrentValue: (c) => c.plumbingScope },
    { id: "plumbing_area", question: "Where is the work focused?", options: ["Kitchen", "Bathroom", "Water heater", "Main line / drain", "Not sure"], step1Key: "Plumbing area", getCurrentValue: () => "" },
  ],
  Electrical: [
    { id: "electrical_scope", question: "What best describes the job?", options: ["Repair", "Panel upgrade", "Rewire", "New install", "Not sure"], step1Key: "Electrical scope", getCurrentValue: (c) => c.electricalScope },
    { id: "electrical_property", question: "Is this for a home or business?", options: ["Home", "Business", "Not sure"], step1Key: "Property type", getCurrentValue: () => "" },
  ],
  Concrete: [
    { id: "concrete_type", question: "What is being poured?", options: ["Driveway", "Patio", "Walkway", "Slab", "Foundation", "Other"], step1Key: "Concrete type", getCurrentValue: (c) => c.concreteType },
    { id: "concrete_demolition", question: "Does it include demolition?", options: ["Yes", "No", "Not sure"], step1Key: "Demolition included", getCurrentValue: () => "" },
  ],
  Remodel: [
    { id: "remodel_area", question: "Which area is being remodeled?", options: ["Kitchen", "Bathroom", "Flooring", "Paint", "Full remodel", "Other"], step1Key: "Remodel area", getCurrentValue: (c) => c.remodelArea },
    { id: "remodel_scale", question: "Is this a small update or full renovation?", options: ["Small update", "Full renovation", "Not sure"], step1Key: "Remodel scale", getCurrentValue: () => "" },
  ],
  Other: [
    { id: "other_category", question: "What type of project is this closest to?", options: ["Exterior", "Interior", "Mechanical", "Not sure"], step1Key: "Project category", getCurrentValue: () => "" },
    { id: "other_description", question: "Short description", options: [], step1Key: "Other description", getCurrentValue: (c) => c.otherDescription },
  ],
};

/** Extract ZIP from stored address (handles "35242", "City, ST 35242", etc.) */
function extractZipFromAddress(addr: string | null): string {
  if (!addr || !addr.trim()) return "";
  const match = addr.match(/\d{5}(?:-\d{4})?/);
  return match ? match[0] : addr.trim();
}

/** Build project_notes from Step 1 + Step 2 optional fields. */
function buildProjectNotes(step1: Record<string, string>, step2: Record<string, string>): string {
  const lines: string[] = [];
  Object.entries(step1).forEach(([key, val]) => {
    if (val?.trim()) lines.push(`${key}: ${val.trim()}`);
  });
  Object.entries(step2).forEach(([key, val]) => {
    if (val?.trim()) lines.push(`${key}: ${val.trim()}`);
  });
  return lines.join("\n");
}

/** Step-based header content (title, subtitle). */
const STEP_HEADER_CONFIG: Record<number, { title: string; subtitle: string }> = {
  1: {
    title: "Start your review",
    subtitle: "Tell us a few details about your project.",
  },
  2: {
    title: "Upload your quote",
    subtitle: "We'll scan it and show your pricing summary instantly.",
  },
};

export default function StartPage() {
  const searchParams = useSearchParams();
  const submissionIdFromUrl = searchParams.get("submissionId") ?? searchParams.get("submission_id");
  const projectIdFromUrl = searchParams.get("project_id");
  const quoteTypeFromUrl = searchParams.get("type");

  const [step, setStepState] = useState(1);
  const stepRef = useRef(1);
  const setStep = useCallback((newStep: number, reason: string) => {
    const from = stepRef.current;
    console.log("[STEP NAV]", { from, to: newStep, source: "setStep", reason });
    stepRef.current = newStep;
    setStepState(newStep);
  }, []);
  useEffect(() => { stepRef.current = step; }, [step]);

  const [submissionId, setSubmissionId] = useState<string | null>(() => submissionIdFromUrl);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [alreadyComplete, setAlreadyComplete] = useState(false);
  const [hasFileFromDraft, setHasFileFromDraft] = useState(false);

  // Step 1 — always required
  const [projectType, setProjectType] = useState("Roofing");
  const [zip, setZip] = useState("");
  // Step 1 — conditional by project type
  const [roofingJobType, setRoofingJobType] = useState("");
  const [insuranceClaim, setInsuranceClaim] = useState("");
  const [propertyClass, setPropertyClass] = useState("");
  const [sidingJobType, setSidingJobType] = useState("");
  const [sidingMaterialKnown, setSidingMaterialKnown] = useState("");
  const [windowCountEst, setWindowCountEst] = useState("");
  const [windowScope, setWindowScope] = useState("");
  const [hvacScope, setHvacScope] = useState("");
  const [hvacSystemType, setHvacSystemType] = useState("");
  const [plumbingScope, setPlumbingScope] = useState("");
  const [electricalScope, setElectricalScope] = useState("");
  const [concreteType, setConcreteType] = useState("");
  const [remodelArea, setRemodelArea] = useState("");
  const [otherDescription, setOtherDescription] = useState("");

  // Step 2 — upload only; optional Quick Questions (max 2) if benchmark data missing
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<File | null>(null);
  useEffect(() => { fileRef.current = file; }, [file]);
  const [projectValue, setProjectValue] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [quickQuestionIndex, setQuickQuestionIndex] = useState(0);
  const [quickQuestionAnswers, setQuickQuestionAnswers] = useState<Record<string, string>>({});

  // Step 2 — email (required for results copy)
  const [email, setEmail] = useState("");
  const [customerName, setCustomerName] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [attemptedStep1, setAttemptedStep1] = useState(false);
  const [attemptedStep2, setAttemptedStep2] = useState(false);
  const [roofingOptionalOpen, setRoofingOptionalOpen] = useState(false);
  const [sidingOptionalOpen, setSidingOptionalOpen] = useState(false);
  const [windowsOptionalOpen, setWindowsOptionalOpen] = useState(false);
  const [hvacOptionalOpen, setHvacOptionalOpen] = useState(false);

  const zipOk = useMemo(() => /^\d{5}(-\d{4})?$/.test(zip.trim()), [zip]);
  const emailOk = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);

  const step1TypeValid = useMemo(() => {
    switch (projectType) {
      case "Roofing": return roofingJobType.trim() !== "";
      case "Siding": return sidingJobType.trim() !== "";
      case "Windows": return true;
      case "HVAC": return hvacScope.trim() !== "";
      case "Plumbing": return plumbingScope.trim() !== "";
      case "Electrical": return electricalScope.trim() !== "";
      case "Concrete": return concreteType.trim() !== "";
      case "Remodel": return remodelArea.trim() !== "";
      case "Other": return otherDescription.trim().split(/\s+/).filter(Boolean).length >= 1;
      default: return false;
    }
  }, [projectType, roofingJobType, sidingJobType, hvacScope, plumbingScope, electricalScope, concreteType, remodelArea, otherDescription]);

  const step1Valid = projectType.trim() !== "" && zipOk && step1TypeValid;

  const step2Valid = !!file;

  const quickQuestionContext: QuickQuestionContext = useMemo(() => ({
    roofingJobType,
    insuranceClaim,
    sidingJobType,
    sidingMaterialKnown,
    windowCountEst,
    windowScope,
    hvacScope,
    hvacSystemType,
    plumbingScope,
    electricalScope,
    concreteType,
    remodelArea,
    otherDescription,
  }), [roofingJobType, insuranceClaim, sidingJobType, sidingMaterialKnown, windowCountEst, windowScope, hvacScope, hvacSystemType, plumbingScope, electricalScope, concreteType, remodelArea, otherDescription]);

  const quickQuestionsToShow = useMemo(() => {
    if (!file) return [];
    const list = QUICK_QUESTIONS[projectType] ?? [];
    const ctx = quickQuestionContext;
    const needed = list.filter((q) => {
      const v = q.getCurrentValue(ctx).trim();
      return !v || v === "Not sure";
    });
    return needed.slice(0, 2);
  }, [file, projectType, quickQuestionContext]);

  const showingQuickQuestion = quickQuestionsToShow.length > 0 && quickQuestionIndex < quickQuestionsToShow.length;
  const currentQuickQuestion = showingQuickQuestion ? quickQuestionsToShow[quickQuestionIndex] : null;

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
      const parseKey = (key: string) => notes.match(new RegExp(`${key}:\\s*(.+?)(?=\\n|$)`, "i"))?.[1]?.trim() ?? "";
      setRoofingJobType(parseKey("Roofing job type"));
      setInsuranceClaim(parseKey("Insurance claim"));
      setPropertyClass(parseKey("Property class"));
      setSidingJobType(parseKey("Siding job type"));
      setSidingMaterialKnown(parseKey("Siding material"));
      setWindowCountEst(parseKey("Window count"));
      setWindowScope(parseKey("Window scope"));
      setHvacScope(parseKey("HVAC scope"));
      setHvacSystemType(parseKey("HVAC system type"));
      setPlumbingScope(parseKey("Plumbing scope"));
      setElectricalScope(parseKey("Electrical scope"));
      setConcreteType(parseKey("Concrete type"));
      setRemodelArea(parseKey("Remodel area"));
      setOtherDescription(parseKey("Other description"));
      setSubmissionId(data.submissionId ?? id);
      setHasFileFromDraft(!!data.hasFile);
      if (stepRef.current === 2) {
        console.log("[STEP NAV] loadDraft skipping step change — user already on step 2", { hasFileRef: !!fileRef.current });
        return;
      }
      if (data.hasFile || data.contractor_name || data.project_value) setStep(2, "load-draft");
      else setStep(2, "load-draft");
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!submissionIdFromUrl || draftLoaded) return;
    loadDraft(submissionIdFromUrl);
  }, [submissionIdFromUrl, draftLoaded, loadDraft]);

  // Reset optional expand states when project type changes
  useEffect(() => {
    setRoofingOptionalOpen(false);
    setSidingOptionalOpen(false);
    setWindowsOptionalOpen(false);
    setHvacOptionalOpen(false);
  }, [projectType]);

  /** Upload state only — never triggers step navigation. Step advances only on Generate button click. */
  function onPickFile(f: File | null) {
    setErr(null);
    setFileErr(null);
    if (!f) {
      fileRef.current = null;
      setQuickQuestionIndex(0);
      setQuickQuestionAnswers({});
      return setFile(null);
    }
    if (f.type !== "application/pdf") {
      setFile(null);
      return setFileErr("Please upload a PDF file.");
    }
    if (f.size > 20 * 1024 * 1024) {
      setFile(null);
      return setFileErr("PDF is too large (max 20MB).");
    }
    fileRef.current = f; // sync ref so loadDraft guard sees it before useEffect runs
    setQuickQuestionIndex(0);
    setQuickQuestionAnswers({});
    setFile(f);
    // No setStep — upload = preparation; Generate = commitment
  }

  function handleStep1Next(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setAttemptedStep1(true);
    if (!step1Valid) return;
    setStep(2, "step1-continue");
  }

  function handleQuickQuestionAnswer(value: string) {
    if (!currentQuickQuestion) return;
    setQuickQuestionAnswers((prev) => ({ ...prev, [currentQuickQuestion.id]: value }));
    if (quickQuestionIndex + 1 < quickQuestionsToShow.length) {
      setQuickQuestionIndex((i) => i + 1);
    } else {
      setQuickQuestionIndex(quickQuestionsToShow.length);
    }
    // No step change — return to "Ready to scan"; user must click Generate to advance
  }

  /** Step 2 submit: validate file + email, then create draft, update, upload, redirect to summary. No step 3. */
  async function handleStep2Submit(e?: React.MouseEvent) {
    e?.preventDefault();
    setErr(null);
    setAttemptedStep2(true);
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

      const step1Notes: Record<string, string> = {};
      if (projectType === "Roofing") {
        if (roofingJobType.trim()) step1Notes["Roofing job type"] = roofingJobType.trim();
        if (insuranceClaim.trim()) step1Notes["Insurance claim"] = insuranceClaim.trim();
        if (propertyClass.trim()) step1Notes["Property class"] = propertyClass.trim();
      } else if (projectType === "Siding") {
        if (sidingJobType.trim()) step1Notes["Siding job type"] = sidingJobType.trim();
        if (sidingMaterialKnown.trim()) step1Notes["Siding material"] = sidingMaterialKnown.trim();
        if (propertyClass.trim()) step1Notes["Property class"] = propertyClass.trim();
      } else if (projectType === "Windows") {
        if (windowCountEst.trim()) step1Notes["Window count"] = windowCountEst.trim();
        if (windowScope.trim()) step1Notes["Window scope"] = windowScope.trim();
      } else if (projectType === "HVAC") {
        if (hvacScope.trim()) step1Notes["HVAC scope"] = hvacScope.trim();
        if (hvacSystemType.trim()) step1Notes["HVAC system type"] = hvacSystemType.trim();
      } else if (projectType === "Plumbing") {
        if (plumbingScope.trim()) step1Notes["Plumbing scope"] = plumbingScope.trim();
      } else if (projectType === "Electrical") {
        if (electricalScope.trim()) step1Notes["Electrical scope"] = electricalScope.trim();
      } else if (projectType === "Concrete") {
        if (concreteType.trim()) step1Notes["Concrete type"] = concreteType.trim();
      } else if (projectType === "Remodel") {
        if (remodelArea.trim()) step1Notes["Remodel area"] = remodelArea.trim();
      } else if (projectType === "Other") {
        if (otherDescription.trim()) step1Notes["Other description"] = otherDescription.trim();
      }
      (QUICK_QUESTIONS[projectType] ?? []).forEach((q) => {
        const v = quickQuestionAnswers[q.id]?.trim();
        if (v) step1Notes[q.step1Key] = v;
      });
      const enrichedNotes = buildProjectNotes(step1Notes, {});
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

  const canProceedStep2 = (!!file || (!!submissionId && hasFileFromDraft)) && emailOk && !loading;

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
      <div className="max-w-[720px] mx-auto px-6 pt-14 sm:pt-16 pb-10 sm:pb-12">
        {STEP_HEADER_CONFIG[step] && (
          <>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {STEP_HEADER_CONFIG[step].title}
            </h1>
            <p className="mt-4 text-sm text-white/50">{STEP_HEADER_CONFIG[step].subtitle}</p>
          </>
        )}
        <section
          className={`mt-8 sm:mt-10 rounded-xl bg-white/[0.04] flex flex-col ${
            step === 2 ? "p-10" : "pt-8 sm:pt-10 px-5 sm:px-6 pb-12 sm:pb-16"
          }`}
        >
          {step === 1 && (
            <form onSubmit={handleStep1Next} className="flex flex-col">
              <h2 className="text-base font-semibold text-white mb-6">Project Information</h2>
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field dark label="Project type *" hint="For pricing comparison.">
                    <Select
                      dark
                      tall
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value)}
                      required
                    >
                      {PROJECT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field dark label="ZIP code *" hint="Local labor & material rates.">
                    <Input
                      dark
                      tall
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

                {/* Roofing */}
                {projectType === "Roofing" && (
                  <div className="space-y-4">
                    <Field dark label="Job type *" hint="Repair vs full replacement.">
                      <Select dark tall value={roofingJobType} onChange={(e) => setRoofingJobType(e.target.value)} required>
                        <option value="">Select…</option>
                        {ROOFING_JOB_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    </Field>
                    {attemptedStep1 && !roofingJobType.trim() && <p className="mt-1 text-xs text-red-400">Select a job type.</p>}
                    <div className="mt-8">
                      <button type="button" onClick={() => setRoofingOptionalOpen((o) => !o)} className="text-sm text-white/50 hover:text-white/80 transition-colors">
                        {roofingOptionalOpen ? "−" : "+"} Additional details (optional)
                      </button>
                      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${roofingOptionalOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className="min-h-0 overflow-hidden">
                          <div className="mt-3 space-y-4 pt-1">
                            <Field dark label="Insurance claim">
                              <Select dark value={insuranceClaim} onChange={(e) => setInsuranceClaim(e.target.value)}>
                                <option value="">Select…</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </Select>
                            </Field>
                            <Field dark label="Property class">
                              <Select dark value={propertyClass} onChange={(e) => setPropertyClass(e.target.value)}>
                                <option value="">Select…</option>
                                {PROPERTY_CLASS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                              </Select>
                            </Field>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Siding */}
                {projectType === "Siding" && (
                  <div className="space-y-4">
                    <Field dark label="Job type *" hint="Partial vs full replacement.">
                      <Select dark tall value={sidingJobType} onChange={(e) => setSidingJobType(e.target.value)} required>
                        <option value="">Select…</option>
                        {SIDING_JOB_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    </Field>
                    {attemptedStep1 && !sidingJobType.trim() && <p className="mt-1 text-xs text-red-400">Select a job type.</p>}
                    <div className="mt-8">
                      <button type="button" onClick={() => setSidingOptionalOpen((o) => !o)} className="text-sm text-white/50 hover:text-white/80 transition-colors">
                        {sidingOptionalOpen ? "−" : "+"} Additional details (optional)
                      </button>
                      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${sidingOptionalOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className="min-h-0 overflow-hidden">
                          <div className="mt-3 space-y-4 pt-1">
                            <Field dark label="Material known">
                              <Select dark value={sidingMaterialKnown} onChange={(e) => setSidingMaterialKnown(e.target.value)}>
                                <option value="">Select…</option>
                                {SIDING_MATERIALS.map((o) => <option key={o} value={o}>{o}</option>)}
                              </Select>
                            </Field>
                            <Field dark label="Property class">
                              <Select dark value={propertyClass} onChange={(e) => setPropertyClass(e.target.value)}>
                                <option value="">Select…</option>
                                {PROPERTY_CLASS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                              </Select>
                            </Field>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Windows */}
                {projectType === "Windows" && (
                  <div className="mt-8">
                    <button type="button" onClick={() => setWindowsOptionalOpen((o) => !o)} className="text-sm text-white/50 hover:text-white/80 transition-colors">
                      {windowsOptionalOpen ? "−" : "+"} Add details (optional)
                    </button>
                    <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${windowsOptionalOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                      <div className="min-h-0 overflow-hidden">
                        <div className="mt-3 space-y-4 pt-1">
                          <Field dark label="Window count estimate">
                            <Select dark value={windowCountEst} onChange={(e) => setWindowCountEst(e.target.value)}>
                              <option value="">Select…</option>
                              {WINDOW_COUNT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                            </Select>
                          </Field>
                          <Field dark label="Scope">
                            <Select dark value={windowScope} onChange={(e) => setWindowScope(e.target.value)}>
                              <option value="">Select…</option>
                              {WINDOW_SCOPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                            </Select>
                          </Field>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* HVAC */}
                {projectType === "HVAC" && (
                  <div className="space-y-4">
                    <Field dark label="Scope *" hint="Replace vs new install.">
                      <Select dark tall value={hvacScope} onChange={(e) => setHvacScope(e.target.value)} required>
                        <option value="">Select…</option>
                        {HVAC_SCOPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    </Field>
                    {attemptedStep1 && !hvacScope.trim() && <p className="mt-1 text-xs text-red-400">Select scope.</p>}
                    <div className="mt-8">
                      <button type="button" onClick={() => setHvacOptionalOpen((o) => !o)} className="text-sm text-white/50 hover:text-white/80 transition-colors">
                        {hvacOptionalOpen ? "−" : "+"} System type (optional)
                      </button>
                      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${hvacOptionalOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className="min-h-0 overflow-hidden">
                          <div className="mt-3 pt-1">
                            <Field dark label="System type">
                              <Select dark value={hvacSystemType} onChange={(e) => setHvacSystemType(e.target.value)}>
                                <option value="">Select…</option>
                                {HVAC_SYSTEM_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
                              </Select>
                            </Field>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Plumbing */}
                {projectType === "Plumbing" && (
                  <Field dark label="Scope *" hint="Repair, replace, or install.">
                    <Select dark tall value={plumbingScope} onChange={(e) => setPlumbingScope(e.target.value)} required>
                      <option value="">Select…</option>
                      {PLUMBING_SCOPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </Select>
                  </Field>
                )}
                {projectType === "Plumbing" && attemptedStep1 && !plumbingScope.trim() && <p className="mt-1 text-xs text-red-400">Select scope.</p>}

                {/* Electrical */}
                {projectType === "Electrical" && (
                  <Field dark label="Scope *" hint="Type of work needed.">
                    <Select dark tall value={electricalScope} onChange={(e) => setElectricalScope(e.target.value)} required>
                      <option value="">Select…</option>
                      {ELECTRICAL_SCOPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </Select>
                  </Field>
                )}
                {projectType === "Electrical" && attemptedStep1 && !electricalScope.trim() && <p className="mt-1 text-xs text-red-400">Select scope.</p>}

                {/* Concrete */}
                {projectType === "Concrete" && (
                  <Field dark label="Project type *" hint="Driveway, patio, etc.">
                    <Select dark tall value={concreteType} onChange={(e) => setConcreteType(e.target.value)} required>
                      <option value="">Select…</option>
                      {CONCRETE_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
                    </Select>
                  </Field>
                )}
                {projectType === "Concrete" && attemptedStep1 && !concreteType.trim() && <p className="mt-1 text-xs text-red-400">Select project type.</p>}

                {/* Remodel */}
                {projectType === "Remodel" && (
                  <Field dark label="Area *" hint="Kitchen, bath, etc.">
                    <Select dark tall value={remodelArea} onChange={(e) => setRemodelArea(e.target.value)} required>
                      <option value="">Select…</option>
                      {REMODEL_AREAS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </Select>
                  </Field>
                )}
                {projectType === "Remodel" && attemptedStep1 && !remodelArea.trim() && <p className="mt-1 text-xs text-red-400">Select area.</p>}

                {/* Other */}
                {projectType === "Other" && (
                  <Field dark label="Brief description *" hint="5–8 words (e.g. deck repair, fence installation).">
                    <Input dark tall placeholder="e.g. deck repair, fence installation" value={otherDescription} onChange={(e) => setOtherDescription(e.target.value)} maxLength={80} />
                  </Field>
                )}
                {projectType === "Other" && attemptedStep1 && !otherDescription.trim() && <p className="mt-1 text-xs text-red-400">Enter a brief description.</p>}
              </div>

              <div className="mt-10 pt-8 flex flex-col items-center">
                    {err && <p className="mb-4 text-sm text-red-400 text-center" role="alert">{err}</p>}
                    <button
                      type="submit"
                      disabled={!step1Valid || loading}
                      className="w-full max-w-[520px] min-h-[56px] px-6 py-4 rounded-xl text-base font-semibold text-black bg-white shadow-[0_6px_20px_rgba(0,0,0,0.18)] transition-all duration-200 ease-out hover:bg-[#f3f3f3] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.22)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:bg-white inline-flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                          <span className="ml-2">Continue…</span>
                        </>
                      ) : (
                        "Continue to Quote Upload"
                      )}
                    </button>
                  </div>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={(e) => e.preventDefault()} className="flex flex-col" noValidate>
                  {/* Upload */}
                  <div className="flex flex-col items-center">
                    <div className="w-full max-w-md">
                      <UploadDropzone dark compact file={file} onPickFile={onPickFile} error={fileErr} />
                      {attemptedStep2 && !file && !(submissionId && hasFileFromDraft) && (
                        <p className="mt-2 text-xs text-red-400 text-center">Upload a PDF to continue.</p>
                      )}
                    </div>
                  </div>

                  {/* Email — 32px below upload */}
                  <div className="mt-8 w-full max-w-md mx-auto">
                    <Field dark label="Email address *" hint="We'll send you a copy of your results.">
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
                    {attemptedStep2 && !emailOk && email.trim() !== "" && (
                      <p className="mt-1 text-xs text-red-400">Enter a valid email.</p>
                    )}
                  </div>

                  {/* Quick Question — only when benchmark data missing; 32px gap */}
                  {showingQuickQuestion && currentQuickQuestion && (
                    <div className="mt-8 w-full max-w-md mx-auto rounded-xl border border-white/10 bg-white/[0.04] p-5">
                      {quickQuestionsToShow.length > 1 && (
                        <p className="mb-3 text-xs text-white/45">
                          {quickQuestionIndex + 1} of {quickQuestionsToShow.length}
                        </p>
                      )}
                      <h3 className="text-base font-semibold text-white">Quick question</h3>
                      <p className="mt-0.5 text-sm text-white/60">To improve accuracy:</p>
                      <p className="mt-3 text-sm font-medium text-white">{currentQuickQuestion.question}</p>
                      {currentQuickQuestion.options.length > 0 ? (
                        <div className="mt-4 flex flex-col gap-2">
                          {currentQuickQuestion.options.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleQuickQuestionAnswer(opt)}
                              className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white transition-colors hover:border-white/25 hover:bg-white/10"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4">
                          <Input
                            dark
                            type="text"
                            placeholder="e.g. deck repair, fence installation"
                            maxLength={80}
                            value={quickQuestionAnswers[currentQuickQuestion.id] ?? ""}
                            onChange={(e) => setQuickQuestionAnswers((prev) => ({ ...prev, [currentQuickQuestion.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              const v = quickQuestionAnswers[currentQuickQuestion.id]?.trim();
                              if (v) handleQuickQuestionAnswer(v);
                            }}
                            className="w-full"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const v = quickQuestionAnswers[currentQuickQuestion.id]?.trim();
                              if (v) handleQuickQuestionAnswer(v);
                            }}
                            disabled={!quickQuestionAnswers[currentQuickQuestion.id]?.trim()}
                            className="mt-3 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Continue
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Primary CTA — 32px below email (or Quick Question) */}
                  <div className="mt-8 flex flex-col items-center">
                    {err && <p className="mb-3 text-sm text-red-400 text-center" role="alert">{err}</p>}
                    <div
                      className={`w-full max-w-md transition-all duration-300 ease-out ${
                        canProceedStep2 ? "opacity-100" : "opacity-60"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleStep2Submit()}
                        disabled={!canProceedStep2 || loading}
                        className={`w-full min-h-[56px] px-6 py-4 rounded-xl text-base font-semibold text-black bg-white inline-flex items-center justify-center transition-all duration-300 ease-out ${
                          canProceedStep2
                            ? "shadow-[0_6px_20px_rgba(0,0,0,0.2)] hover:bg-[#f3f3f3] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.28)] cursor-pointer disabled:hover:translate-y-0 disabled:hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]"
                            : "shadow-[0_4px_12px_rgba(0,0,0,0.12)] cursor-not-allowed [&:hover]:translate-y-0 [&:hover]:bg-white"
                        }`}
                      >
                        {loading ? (
                          <>
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                              <path className="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                            <span className="ml-2">Preparing your summary…</span>
                          </>
                        ) : (
                          "Generate my free summary"
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Back link — 32px below CTA */}
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setStep(1, "back-button")}
                      disabled={loading}
                      className="text-sm text-white/40 hover:text-white/60 transition disabled:opacity-50"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}

          </section>
          <p className="mt-8 text-center text-xs text-white/40">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="text-white/50 underline hover:text-white/70">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="text-white/50 underline hover:text-white/70">Privacy Policy</Link>.
          </p>
      </div>
    </div>
  );
}
