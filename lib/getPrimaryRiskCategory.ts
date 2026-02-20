export type CategoryRisk = {
  name: string;
  score: number;
  risk: "Low" | "Medium" | "High";
};

export function getPrimaryRiskCategory(categories?: CategoryRisk[] | null) {
  if (!categories || categories.length === 0) return null;

  const riskRank = { High: 3, Medium: 2, Low: 1 };

  return [...categories].sort(
    (a, b) => riskRank[b.risk] - riskRank[a.risk]
  )[0];
}
