"use client";

import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

export default function StartFormFields({
  email,
  setEmail,
  emailOk,
  projectType,
  setProjectType,
  projectNotes,
  setProjectNotes,
  emailReadOnly,
}: {
  email: string;
  setEmail: (v: string) => void;
  emailOk: boolean;
  projectType: string;
  setProjectType: (v: string) => void;
  projectNotes: string;
  setProjectNotes: (v: string) => void;
  emailReadOnly?: boolean;
}) {
  return (
    <div className="space-y-6">
      <Field label="Email" hint={emailReadOnly ? "Report link will be sent here and added to your dashboard." : "We’ll send your report link to this email."}>
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          type="email"
          inputMode="email"
          autoComplete="email"
          error={!emailOk && email.length > 3}
          readOnly={emailReadOnly}
          disabled={emailReadOnly}
          className={emailReadOnly ? "bg-gray-50 cursor-not-allowed" : undefined}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project type">
          <Select value={projectType} onChange={(e) => setProjectType(e.target.value)}>
            <option>Roofing</option>
            <option>HVAC</option>
            <option>Plumbing</option>
            <option>Electrical</option>
            <option>Remodel</option>
            <option>Other</option>
          </Select>
        </Field>

        <Field label="Notes (optional)" hint="Pricing, scope, materials…">
          <Input
            value={projectNotes}
            onChange={(e) => setProjectNotes(e.target.value)}
            placeholder="Anything to focus on?"
          />
        </Field>
      </div>
    </div>
  );
}
