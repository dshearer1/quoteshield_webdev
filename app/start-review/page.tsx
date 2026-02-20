import { redirect } from "next/navigation";

export default async function StartReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string }>;
}) {
  const params = await searchParams;
  const q = params?.canceled ? "?canceled=1" : "";
  redirect(`/start${q}`);
}
