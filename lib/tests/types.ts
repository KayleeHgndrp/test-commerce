export type Category = "personality" | "relationships" | "work" | "screeners" | "wellbeing";

export type Outcome = "dimensions" | "top" | "attachment" | "axes" | "political";

export type Scale = "agree" | "frequency" | "phq" | "intensity";

export type Level = "low" | "mid" | "high";

export type InstrumentDefinition = {
  id: string;
  items: number[];
  bands: { max: number; key: string }[];
};

export type TestDefinition = {
  slug: string;
  kind: "likert";
  scale: Scale;
  category: Category;
  minutes: number;
  icon: string;
  outcome: Outcome;
  dimensions: string[];
  items: { dim: string; rev?: boolean }[];
  instrument?: InstrumentDefinition;
  crisisItems?: number[];
};

export type DimensionText = {
  name: string;
  short: string;
  low: string;
  mid: string;
  high: string;
};

export type TestText = {
  name: string;
  tagline: string;
  intro: string;
  seoTitle: string;
  seoDescription: string;
  items: string[];
  dimensions: Record<string, DimensionText>;
  summary: string;
  types?: Record<string, { name: string; text: string }>;
  instrument?: { name: string; description: string; bands: Record<string, string> };
  // Couple report text per pair of types, keyed by pairKey (e.g. "anxious+secure").
  couple?: Record<string, string>;
};

export type DimensionScore = { dim: string; percent: number; level: Level };

export type TestResult = {
  scores: DimensionScore[];
  // Main type: a dimension id ("top"), a type id ("attachment", "political") or a 4-letter code ("axes").
  type?: string;
  instrument?: { score: number; max: number; band: string };
  crisis: boolean;
};
