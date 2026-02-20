import { type ReactNode } from "react";

type SettingsCardProps = {
  title: string;
  children: ReactNode;
};

export default function SettingsCard({ title, children }: SettingsCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-6">{children}</div>
    </div>
  );
}
