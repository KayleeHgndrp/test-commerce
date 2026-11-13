import { describe, expect, it } from "vitest";
import { locales } from "@/lib/i18n/locales";
import { allDefinitions, getTestText, getUi } from "@/lib/i18n/messages";
import { renderReport } from "@/lib/report/render";
import { decodeAnswers, encodeAnswers, scalePoints, scoreTest } from "@/lib/tests/scoring";
import { answersFor } from "./helpers/fakes";

// Flow 1: a visitor finishes a test and sees a result. If any test or language
// breaks here, nobody on that page can ever reach the buy button.

describe("een test afmaken en het resultaat zien", () => {
  it("heeft minstens 31 tests", () => {
    expect(allDefinitions.length).toBeGreaterThanOrEqual(31);
  });

  for (const def of allDefinitions) {
    describe(def.slug, () => {
      const points = scalePoints[def.scale];
      const patterns = {
        laag: answersFor(def.items.length, points, () => 1),
        midden: answersFor(def.items.length, points),
        hoog: answersFor(def.items.length, points, () => points),
        gemengd: answersFor(def.items.length, points, (i) => (i * 7) % points + 1),
      };

      it("accepteert alle antwoorden en weigert kapotte antwoorden", () => {
        for (const encoded of Object.values(patterns)) {
          expect(encodeAnswers(decodeAnswers(def, encoded)!)).toBe(encoded);
        }
        expect(decodeAnswers(def, patterns.midden.slice(1))).toBeNull(); // one answer missing
        expect(decodeAnswers(def, "0" + patterns.midden.slice(1))).toBeNull(); // answer out of range
        expect(decodeAnswers(def, String(points + 1).repeat(def.items.length))).toBeNull();
      });

      it("geeft een uitslag met scores tussen 0 en 100", () => {
        for (const encoded of Object.values(patterns)) {
          const result = scoreTest(def, decodeAnswers(def, encoded)!);
          expect(result.scores.map((s) => s.dim)).toEqual(def.dimensions);
          for (const s of result.scores) {
            expect(s.percent).toBeGreaterThanOrEqual(0);
            expect(s.percent).toBeLessThanOrEqual(100);
          }
          if (def.outcome !== "dimensions") expect(result.type).toBeTruthy();
        }
      });

      it("heeft in alle 32 talen een vraag per item en tekst voor elke uitslag", async () => {
        for (const locale of locales) {
          const text = await getTestText(locale, def.slug);
          expect(text.name, `${locale}: name`).toBeTruthy();
          expect(text.items, `${locale}: questions`).toHaveLength(def.items.length);
          for (const q of text.items) expect(q.trim(), `${locale}: empty question`).not.toBe("");
          for (const dim of def.dimensions) {
            const d = text.dimensions[dim];
            expect(d?.name && d.low && d.mid && d.high, `${locale}: dimension ${dim}`).toBeTruthy();
          }
          for (const encoded of Object.values(patterns)) {
            const type = scoreTest(def, decodeAnswers(def, encoded)!).type;
            if (type && def.outcome !== "top") expect(text.types?.[type]?.name, `${locale}: type ${type}`).toBeTruthy();
          }
        }
      });

      it("maakt het betaalde rapport (mail met PDF)", async () => {
        const report = await renderReport("nl", def.slug, decodeAnswers(def, patterns.gemengd)!);
        expect(report.subject).toBeTruthy();
        expect(report.text.length).toBeGreaterThan(200);
        expect(report.attachments?.[0].filename).toMatch(/\.pdf$/);
        expect(report.attachments![0].content.subarray(0, 4).toString()).toBe("%PDF");
      });
    });
  }

  it("heeft de knoppen en teksten van de resultaatpagina in alle talen", async () => {
    for (const locale of locales) {
      const ui = await getUi(locale);
      expect(ui.result, locale).toBeTruthy();
      expect(ui.plans, locale).toBeTruthy();
    }
  });
});
