export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function StartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
