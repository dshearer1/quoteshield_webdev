import Link from "next/link";

const BULLETS = [
  "AI price analysis",
  "Red flag detection",
  "Questions to ask contractors",
  "Savings insights",
];

type EmptyStateProps = {
  title?: string;
  bullets?: string[];
  ctaLabel?: string;
  ctaHref?: string;
};

export default function EmptyState({
  title = "No reviews yet",
  bullets = BULLETS,
  ctaLabel = "Start Your First Review",
  ctaHref = "/start",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm sm:px-8 sm:py-12">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <ul className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-gray-600 sm:gap-x-8">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
