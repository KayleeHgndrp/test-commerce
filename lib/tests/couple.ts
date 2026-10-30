import { scoreTest } from "./scoring";
import type { TestDefinition } from "./types";

export type Closeness = "alike" | "some" | "different";
export type MatchBand = "high" | "mid" | "low";

export const closenessFor = (gap: number): Closeness => (gap < 15 ? "alike" : gap < 35 ? "some" : "different");

// Compares two people who took the same test. The score is how close they are
// on every dimension; for attachment it also rewards how secure both are,
// because two very avoidant people are alike without being a good match.
export function coupleMatch(def: TestDefinition, mine: number[], theirs: number[]) {
  const a = scoreTest(def, mine);
  const b = scoreTest(def, theirs);
  const dims = a.scores.map((s, i) => {
    const other = b.scores[i].percent;
    return { dim: s.dim, mine: s.percent, theirs: other, closeness: closenessFor(Math.abs(s.percent - other)) };
  });
  const similarity = 100 - dims.reduce((sum, d) => sum + Math.abs(d.mine - d.theirs), 0) / dims.length;
  let score = similarity;
  if (def.outcome === "attachment") {
    const security = (r: typeof a) => 100 - r.scores.reduce((sum, s) => sum + s.percent, 0) / r.scores.length;
    score = 0.35 * security(a) + 0.35 * security(b) + 0.3 * similarity;
  }
  score = Math.round(score);
  const band: MatchBand = score >= 80 ? "high" : score >= 60 ? "mid" : "low";
  return { score, band, dims, mine: a, theirs: b };
}

// Order-independent key for a pair of types, e.g. "anxious+secure".
export const pairKey = (x: string, y: string) => [x, y].sort().join("+");

// Invite links carry the inviter's answers, so a name is kept short and plain.
export const cleanName = (value: unknown) =>
  typeof value === "string" ? value.replace(/[^\p{L}\p{N} '.-]/gu, "").trim().slice(0, 30) : "";
