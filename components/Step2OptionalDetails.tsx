"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

const ROOF_MATERIALS = ["Asphalt shingles", "Metal", "Tile", "Flat / TPO", "Not sure"];
const HOME_HEIGHTS = ["1 story", "2 story", "3+ story", "Not sure"];
const ROOFING_STEP2_TAGS = ["Insurance job", "Multiple layers", "Solar panels"];
const HVAC_SYSTEM_TYPES = ["Central split", "Package", "Mini-split", "Not sure"];
const HVAC_FUEL_TYPES = ["Gas", "Electric", "Heat pump", "Dual fuel", "Not sure"];
const HVAC_DUCTWORK_OPTIONS = ["Yes", "No", "Not sure"];
const WINDOW_COUNT_OPTIONS = ["1–5", "6–10", "11–20", "21+", "Not sure"];
const WINDOW_TYPES = ["Single pane", "Double pane", "Triple pane", "Not sure"];
const IMPACT_RATED_OPTIONS = ["Yes", "No", "Not sure"];
const CONCRETE_TYPES = ["Driveway", "Patio", "Walkway", "Slab", "Foundation", "Other"];
const CONCRETE_DEMOLITION_OPTIONS = ["Yes", "No", "Not sure"];

interface Step2OptionalDetailsProps {
  projectType: string;
  optionalDetailsOpen: boolean;
  setOptionalDetailsOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  roofMaterial: string;
  setRoofMaterial: (v: string) => void;
  homeHeight: string;
  setHomeHeight: (v: string) => void;
  projectNotes: string;
  setProjectNotes: (v: string | ((n: string) => string)) => void;
  hvacSystemType: string;
  setHvacSystemType: (v: string) => void;
  hvacTonnage: string;
  setHvacTonnage: (v: string) => void;
  hvacFuelType: string;
  setHvacFuelType: (v: string) => void;
  hvacDuctworkIncluded: string;
  setHvacDuctworkIncluded: (v: string) => void;
  windowCountEst: string;
  setWindowCountEst: (v: string) => void;
  windowType: string;
  setWindowType: (v: string) => void;
  impactRated: string;
  setImpactRated: (v: string) => void;
  concreteType: string;
  setConcreteType: (v: string) => void;
  concreteThickness: string;
  setConcreteThickness: (v: string) => void;
  demolitionIncluded: string;
  setDemolitionIncluded: (v: string) => void;
}

export default function Step2OptionalDetails(props: Step2OptionalDetailsProps) {
  const { projectType, optionalDetailsOpen, setOptionalDetailsOpen } = props;
  if (!["Roofing", "HVAC", "Windows", "Concrete"].includes(projectType)) return null;

  return (
    <div className="border-t border-white/5 pt-6">
      <button
        type="button"
        onClick={() => setOptionalDetailsOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left text-sm text-white/50 hover:text-white/70 transition"
      >
        <span>Add additional details (optional)</span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform ${optionalDetailsOpen ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {optionalDetailsOpen && (
        <div className="mt-4 space-y-4 pl-0">
          {projectType === "Roofing" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1">Roof material</label>
                  <Select dark value={props.roofMaterial} onChange={(e) => props.setRoofMaterial(e.target.value)}>
                    <option value="">Select…</option>
                    {ROOF_MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1">Home height</label>
                  <Select dark value={props.homeHeight} onChange={(e) => props.setHomeHeight(e.target.value)}>
                    <option value="">Select…</option>
                    {HOME_HEIGHTS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1">Tags</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {ROOFING_STEP2_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => props.setProjectNotes((n) => (n ? `${n}; ${tag}` : tag))}
                      className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60 hover:bg-white/10 hover:border-white/15 transition"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {projectType === "HVAC" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1">System type</label>
                <Select dark value={props.hvacSystemType} onChange={(e) => props.setHvacSystemType(e.target.value)}>
                  <option value="">Select…</option>
                  {HVAC_SYSTEM_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1">Tonnage (optional)</label>
                <Input dark type="text" placeholder="e.g. 3, 4, 5" value={props.hvacTonnage} onChange={(e) => props.setHvacTonnage(e.target.value.replace(/[^0-9.]/g, ""))} maxLength={6} />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1">Fuel type</label>
                <Select dark value={props.hvacFuelType} onChange={(e) => props.setHvacFuelType(e.target.value)}>
                  <option value="">Select…</option>
                  {HVAC_FUEL_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1">Ductwork included</label>
                <Select dark value={props.hvacDuctworkIncluded} onChange={(e) => props.setHvacDuctworkIncluded(e.target.value)}>
                  <option value="">Select…</option>
                  {HVAC_DUCTWORK_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </div>
            </div>
          )}
          {projectType === "Windows" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1">Window count</label>
                <Select dark value={props.windowCountEst} onChange={(e) => props.setWindowCountEst(e.target.value)}>
                  <option value="">Select…</option>
                  {WINDOW_COUNT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1">Window type</label>
                <Select dark value={props.windowType} onChange={(e) => props.setWindowType(e.target.value)}>
                  <option value="">Select…</option>
                  {WINDOW_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1">Impact rated</label>
                <Select dark value={props.impactRated} onChange={(e) => props.setImpactRated(e.target.value)}>
                  <option value="">Select…</option>
                  {IMPACT_RATED_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </div>
            </div>
          )}
          {projectType === "Concrete" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1">Concrete type</label>
                <Select dark value={props.concreteType} onChange={(e) => props.setConcreteType(e.target.value)}>
                  <option value="">Select…</option>
                  {CONCRETE_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1">Thickness (optional)</label>
                <Input dark type="text" placeholder="e.g. 4 in" value={props.concreteThickness} onChange={(e) => props.setConcreteThickness(e.target.value)} maxLength={20} />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1">Demolition included</label>
                <Select dark value={props.demolitionIncluded} onChange={(e) => props.setDemolitionIncluded(e.target.value)}>
                  <option value="">Select…</option>
                  {CONCRETE_DEMOLITION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </div>
            </div>
          )}
          <div className="border-t border-white/5 pt-4">
            <label className="block text-xs font-medium text-white/40 mb-1">Notes</label>
            <textarea
              value={props.projectNotes}
              onChange={(e) => props.setProjectNotes(e.target.value)}
              placeholder="Damage details, access limits, HOA, permits, etc."
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm !text-white placeholder:text-white/30 outline-none focus:border-white/20 resize-y"
            />
          </div>
        </div>
      )}
    </div>
  );
}
