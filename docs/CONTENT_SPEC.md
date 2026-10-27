# Test content specification

Every test consists of two files:

1. `content/definitions/<slug>.json` – structure and scoring (language independent)
2. `messages/<locale>/tests/<slug>.json` – all visible text for one language

`npm run check:content` validates that both files line up for every locale.

## 1. Definition file

```jsonc
{
  "slug": "burnout",              // URL segment, lowercase, dashes
  "kind": "likert",               // "likert" (rating scale) or "quiz" (right/wrong answers)
  "scale": "frequency",           // likert only: "agree" (Strongly disagree…Strongly agree) or "frequency" (Never…Very often)
  "category": "work",             // one of: "personality", "relationships", "work", "screeners", "wellbeing"
  "minutes": 5,                   // estimated duration
  "icon": "🔥",                   // single emoji used on cards
  "outcome": "dimensions",        // see below
  "dimensions": ["exhaustion", "cynicism", "inefficacy"],
  "items": [
    { "dim": "exhaustion" },
    { "dim": "inefficacy", "rev": true }   // rev = reverse scored (agreeing LOWERS the dimension score)
  ]
}
```

For `"kind": "quiz"` items look like `{ "dim": "numerical", "answer": 2 }`, where `answer` is the
0-based index of the correct option in the text file.

### Outcomes

| outcome       | meaning                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------- |
| `dimensions`  | Every dimension is scored 0–100 % and interpreted as low / mid / high.                        |
| `top`         | Same as `dimensions`, but the highest dimension is announced as the person's main type.       |
| `attachment`  | Exactly two dimensions `anxiety` and `avoidance`; combination maps to one of the 4 `types`.   |
| `axes`        | 16-types test. Exactly 4 dims `extraversion`, `sensing`, `thinking`, `judging`; ≥ 50 % gives E/S/T/J, otherwise I/N/F/P. The 4-letter code maps to one of 16 `types` (keys like `INTJ`). |
| `political`   | Exactly 2 dims `economic` (high = free-market right, low = left) and `social` (high = authoritarian, low = libertarian). Maps to `types`: `left_libertarian`, `left_authoritarian`, `right_libertarian`, `right_authoritarian`, `centrist` (both between 40 and 60). |

Scoring: each likert answer is 1–5 (reverse items: 6 − answer). Dimension % = (sum − min) / (max − min) × 100.
Levels: `< 35` → `low`, `< 65` → `mid`, otherwise `high`.

Rules for items:
- EVERY test has EXACTLY 100 items (it should take ~5 minutes, so items must be short: max ~12 words).
- Dimensions do not need equal item counts, but keep them as balanced as possible (e.g. 9 types → 11–12 each).
- Mix the dimensions throughout the item list (do not group all items of one dimension together).
- Make roughly 20–30 % of the items per dimension reverse-scored where it makes sense, so people cannot simply click the same answer.
- No two items may be (near) duplicates.
- Items must be ORIGINAL wording, short, first person ("I …"), no double negatives, no jargon.
- Items must fit the scale: for `frequency` describe behaviour/experiences ("I feel …"); for `agree` statements.

## 2. Text file (English example)

```jsonc
{
  "name": "Burnout Test",
  "tagline": "Find out how close you are to burning out.",     // max ~12 words, shown on cards
  "intro": "2–4 sentences shown on the test landing page: what it measures, for whom, how it works.",
  "seoTitle": "Burnout Test – Free online burnout risk check",  // max ~60 chars
  "seoDescription": "max ~155 chars",
  "items": ["I feel emotionally drained by my work.", "..."],    // SAME ORDER & LENGTH as definition items
  "dimensions": {
    "exhaustion": {
      "name": "Exhaustion",
      "short": "One sentence: what this dimension measures.",
      "low": "60–110 words: interpretation of a low score + 1–2 practical tips.",
      "mid": "60–110 words: interpretation of a medium score + 1–2 practical tips.",
      "high": "60–110 words: interpretation of a high score + 1–2 practical tips."
    }
  },
  "summary": "2–3 sentences shown at the top of the paid report explaining how to read the results.",
  "types": { }   // only for outcomes "attachment", "axes" and "political" (see below)
}
```

For `"kind": "quiz"` (not used at the moment) each item is an object instead of a string:
`{ "q": "Which number comes next? 2, 4, 8, 16, …", "options": ["24", "30", "32", "36"] }` (4–6 options).

For `"outcome": "axes"` add `"types"` with all 16 codes (`ISTJ` … `ENFP`), each `{ "name": "The Strategist", "text": "80–130 words" }`.
For `"outcome": "political"` add `"types"` with the 5 keys listed above (strictly neutral, non-judgemental wording; describe each position fairly).

For `"outcome": "attachment"` add:
```json
"types": {
  "secure":   { "name": "Secure",           "text": "80–130 words" },
  "anxious":  { "name": "Anxious-preoccupied", "text": "…" },
  "avoidant": { "name": "Dismissive-avoidant", "text": "…" },
  "fearful":  { "name": "Fearful-avoidant",    "text": "…" }
}
```

Tone: warm, clear, non-judgemental, second person ("you"). Never diagnose ("you have ADHD"); say
"your answers suggest …". For all tests in category `screeners` and for burnout the `high` texts must
recommend talking to a qualified professional. For depression, BPD, bipolar and trauma the summary and
every `high` text must also include one gentle sentence: if you are having thoughts of harming yourself,
contact local emergency services or a crisis line right away. Never include items about self-harm or suicide.

## Translating

Translate only the values in `messages/en/**`. Never translate keys, dimension ids, `{placeholders}`
or numbers in quiz options. Quiz questions may be adapted (e.g. verbal analogies) as long as the
correct answer stays at the same option index.

## Answer scales

| scale        | points | labels                                                                  |
| ------------ | ------ | ----------------------------------------------------------------------- |
| `agree`      | 5      | Strongly disagree · Disagree · Neutral · Agree · Strongly agree         |
| `frequency`  | 5      | Never · Rarely · Sometimes · Often · Very often                         |
| `phq`        | 4      | Not at all · Several days · More than half the days · Nearly every day  |
| `intensity`  | 5      | Not at all · A little bit · Moderately · Quite a bit · Extremely        |

Reverse items score `points + 1 − answer`.

## Embedded validated instruments

A definition may embed a public-domain validated questionnaire whose official score is reported separately:

```jsonc
"instrument": {
  "id": "phq9",
  "items": [0, 1, 2, 3, 4, 5, 6, 7, 8],         // item indexes that make up the instrument (scored answer − 1)
  "bands": [                                    // first band whose max ≥ total wins
    { "max": 4, "key": "minimal" }, { "max": 9, "key": "mild" }, { "max": 14, "key": "moderate" },
    { "max": 19, "key": "moderately_severe" }, { "max": 27, "key": "severe" }
  ]
},
"crisisItems": [8]                               // answering ≥ 2nd option shows crisis resources for free
```

and the text file then has:

```jsonc
"instrument": {
  "name": "PHQ-9",
  "description": "1–2 sentences explaining the instrument and that it is a screening tool.",
  "bands": { "minimal": "Minimal", "mild": "Mild", ... }
}
```

Only public-domain instruments are embedded (PHQ-9, PCL-5). Their items must be reproduced verbatim in
English; translators should use the wording of an official translation where they know it.
