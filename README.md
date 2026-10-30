# Personality Reveal – multilingual online tests

Next.js 16 site with 100-question psychological tests in 32 European languages. Taking a test is free;
the detailed personal report costs €3.95 and is emailed after payment via Stripe.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Stripe/SMTP settings (optional for local dev)
npm run dev
```

Without `STRIPE_SECRET_KEY` the dev server skips payment, shows the report on the thank-you page and "sends" it
straight away. Without `SMTP_HOST` the email is logged to the console instead.

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
- `app/api/stripe/webhook` – on payment renders the report (`lib/report/render.ts`) and emails it over SMTP
- `/[locale]/[test]/thanks?session_id=…` – verifies the payment with Stripe, shows the full report on the page and
  emails it if the webhook has not done so yet (`lib/delivery.ts`; a flag on the PaymentIntent prevents double sends)
- `/[locale]/contact` + `app/api/contact` – contact form, delivered over SMTP to `NEXT_PUBLIC_CONTACT_EMAIL`/`CONTACT_FROM_EMAIL`

Missing translations fall back to English per key, so a partially translated language still works.
See `docs/CONTENT_SPEC.md` for the content format.

## Going live (checklist)

**1. Brand & domain**
- Choose the final name and set `NEXT_PUBLIC_SITE_NAME` and `NEXT_PUBLIC_SITE_URL` (used in emails, PDFs, share images, sitemap).
- Replace `app/icon.svg` if you have your own logo.

**2. Hosting (Vercel recommended)**
1. Import the GitHub repo at vercel.com → New Project (framework is detected automatically).
2. Add every variable from `.env.example` under Settings → Environment Variables.
3. Add your domain under Settings → Domains and point DNS to Vercel.

**3. Stripe**
1. Copy the live secret key into `STRIPE_SECRET_KEY`.
2. Developers → Webhooks → add `https://<domain>/api/stripe/webhook` with events `checkout.session.completed` and
   `checkout.session.async_payment_succeeded`; copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Settings → Payment methods: enable cards, iDEAL, Bancontact, etc.
4. EU VAT: register for the OSS scheme, activate Stripe Tax (Settings → Tax), then set `STRIPE_AUTOMATIC_TAX=true`.
   The €3.95 price is VAT-inclusive; Stripe applies the customer country's rate.
5. Do one real test purchase and refund it.

**4. Email (SMTP)**
- Fill `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_FROM_EMAIL`.
- Set up SPF, DKIM and DMARC for the sender domain at your mail provider, otherwise reports land in spam.

**5. Legal (have a lawyer review)**
- Company details in `COMPANY_*` (legal notice / Impressum, mandatory in DE/AT) and `NEXT_PUBLIC_COMPANY_DETAILS`.
- Review the privacy policy, terms, cookie and refund texts (`messages/*/ui.json` → `legal`).
- Checkout consent includes the EU waiver of the right of withdrawal for immediately delivered digital content.
- Have the PHQ-9 and PCL-5 items checked against the official translation for each language
  (`messages/<locale>/tests/depression.json` items 0–8, `trauma.json` items 0–19).

**6. Monitoring & analytics**
- Plausible: add the site, set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, create goals `Test Start`, `Test Complete`,
  `Checkout Start` and `Purchase` (enable revenue tracking for Purchase).
- Set `ERROR_WEBHOOK_URL` (Slack/Discord/Teams incoming webhook) to get notified of server errors.
- Set `ADMIN_TOKEN` to resend reports: `curl -X POST https://<domain>/api/admin/resend -H "authorization: Bearer $ADMIN_TOKEN"
  -H "content-type: application/json" -d '{"sessionId":"cs_live_…"}'` (optionally `"email":"other@address"`).

## Validated questionnaires

The depression test embeds the PHQ-9 and the trauma test the PCL-5; both are public domain and are scored
with their official cut-offs. ASRS (ADHD), MDQ (bipolar) and MSI-BPD are copyrighted and require a licence
for commercial use, so those tests use original items covering the same symptom areas.
