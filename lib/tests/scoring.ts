import type { DimensionScore, Level, Scale, TestDefinition, TestResult } from "./types";

export const scalePoints: Record<Scale, number> = { agree: 5, frequency: 5, phq: 4, intensity: 5 };

export const levelFor = (percent: number): Level =>
  percent < 35 ? "low" : percent < 65 ? "mid" : "high";

// Answers are encoded as one digit (1..points) per item.
export const encodeAnswers = (answers: number[]) => answers.join("");

export function decodeAnswers(def: TestDefinition, encoded: string): number[] | null {
  if (encoded.length !== def.items.length || !/^\d+$/.test(encoded)) return null;
  const points = scalePoints[def.scale];
  const answers = [...encoded].map(Number);
  return answers.every((a) => a >= 1 && a <= points) ? answers : null;
}

const AXES = [
  ["extraversion", "E", "I"],
  ["sensing", "S", "N"],
  ["thinking", "T", "F"],
  ["judging", "J", "P"],
] as const;

export function scoreTest(def: TestDefinition, answers: number[]): TestResult {
  const points = scalePoints[def.scale];
  const totals = new Map(def.dimensions.map((d) => [d, { sum: 0, count: 0 }]));

  def.items.forEach((item, i) => {
    const t = totals.get(item.dim)!;
    t.sum += item.rev ? points + 1 - answers[i] : answers[i];
    t.count += 1;
  });

  const scores: DimensionScore[] = def.dimensions.map((dim) => {
    const { sum, count } = totals.get(dim)!;
    const percent = count ? Math.round(((sum - count) / (count * (points - 1))) * 100) : 0;
    return { dim, percent, level: levelFor(percent) };
  });
  const pct = (dim: string) => scores.find((s) => s.dim === dim)?.percent ?? 0;

  const result: TestResult = {
    scores,
    crisis: (def.crisisItems ?? []).some((i) => answers[i] >= 2),
  };

  switch (def.outcome) {
    case "top":
      result.type = [...scores].sort((a, b) => b.percent - a.percent)[0].dim;
      break;
    case "attachment": {
      const anxious = pct("anxiety") >= 50;
      const avoidant = pct("avoidance") >= 50;
      result.type = anxious ? (avoidant ? "fearful" : "anxious") : avoidant ? "avoidant" : "secure";
      break;
    }
    case "axes":
      result.type = AXES.map(([dim, high, low]) => (pct(dim) >= 50 ? high : low)).join("");
      break;
    case "political": {
      const economic = pct("economic");
      const social = pct("social");
      const centrist = [economic, social].every((p) => p >= 40 && p <= 60);
      result.type = centrist
        ? "centrist"
        : `${economic >= 50 ? "right" : "left"}_${social >= 50 ? "authoritarian" : "libertarian"}`;
      break;
    }
  }

  if (def.instrument) {
    const score = def.instrument.items.reduce((sum, i) => sum + answers[i] - 1, 0);
    const max = def.instrument.items.length * (points - 1);
    const band = def.instrument.bands.find((b) => score <= b.max)?.key ?? def.instrument.bands.at(-1)!.key;
    result.instrument = { score, max, band };
  }

  return result;
}
