# Testora – multilingual online tests

Next.js 16 site with 100-question psychological tests in 32 European languages. Taking a test is free;
the detailed personal report costs €1.25 and is emailed after payment via Stripe.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Stripe/Resend keys (optional for local dev)
npm run dev
```

Without `STRIPE_SECRET_KEY` the dev server skips payment and "sends" the report straight away. Without
`RESEND_API_KEY` the email is logged to the console instead.

## URL structure

| URL                         | Page                                               |
| --------------------------- | -------------------------------------------------- |
| `/`                         | Redirects to the visitor's language                |
| `/es`                       | Home page with all tests (`#tests`)                |
| `/es/career`                | Test landing page (SEO)                            |
| `/es/career/start`          | Gender choice, then the 100 questions              |
| `/es/career/result`         | Locked preview + email/checkout form               |
| `/es/career/thanks`         | Confirmation after payment                         |

## How it fits together

- `content/definitions/<slug>.json` – questions' scoring structure (dimensions, reverse items, outcome type)
- `messages/<locale>/ui.json` – interface texts; `messages/<locale>/tests/<slug>.json` – test texts
- `content/tests.json` – which tests are shown, in which order
- `scripts/gen-registry.mjs` – generates `lib/generated/registry.ts` (runs automatically before dev/build)
- `npm run check:content` – validates every definition and translation (counts, keys, placeholders)
- `lib/tests/scoring.ts` – scoring, incl. 16-types code, attachment style, political quadrant, PHQ-9/PCL-5
- `app/api/checkout` – creates a Stripe Checkout session; answers travel in the session metadata (no database)
- `app/api/stripe/webhook` – on payment renders the report (`lib/report/render.ts`) and emails it via Resend

Missing translations fall back to English per key, so a partially translated language still works.
See `docs/CONTENT_SPEC.md` for the content format.

## Going live

1. Set all variables from `.env.example` in your hosting environment (e.g. Vercel).
2. In Stripe, add a webhook endpoint `https://<domain>/api/stripe/webhook` for
   `checkout.session.completed` and `checkout.session.async_payment_succeeded`; enable the payment methods
   you want (cards, iDEAL, Bancontact, …) in the Stripe dashboard.
3. Verify your sending domain in Resend and set `EMAIL_FROM`.
4. Add your company details via `NEXT_PUBLIC_COMPANY_DETAILS` and review the privacy/terms texts.

## Validated questionnaires

The depression test embeds the PHQ-9 and the trauma test the PCL-5; both are public domain and are scored
with their official cut-offs. ASRS (ADHD), MDQ (bipolar) and MSI-BPD are copyrighted and require a licence
for commercial use, so those tests use original items covering the same symptom areas.
