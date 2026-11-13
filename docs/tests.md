# Automatische tests

Deze tests controleren de flows die omzet opleveren. Ze draaien vanzelf bij elke pull request (GitHub Actions, "Tests"). Een rood kruisje betekent: niet mergen, eerst repareren.

Stripe, Brevo en de mailserver worden in de tests nagebootst. Er wordt dus nooit echt betaald en er gaat nooit een echte mail naar iemand.

| Bestand | Wat het controleert |
| --- | --- |
| `tests/1-test-afmaken.test.ts` | Elke test is in alle 32 talen in te vullen, geeft een uitslag en een rapport met PDF |
| `tests/2-afrekenen.test.ts` | Prijzen (€1,99, €4,95, €14,95, €5,95), upgrade naar alles-pas, partnercode en nieuwsbriefvinkje gaan goed naar Stripe |
| `tests/3-rapport-leveren.test.ts` | Na betaling komt het rapport precies één keer aan, ook bij pakket, alles-pas en relatie-rapport; bij een fout krijgt de eigenaar een waarschuwing |
| `tests/4-e-mailflow.test.ts` | Het e-mailblok op de resultaatpagina (niet bij depressie, ADHD, politiek en andere gezondheidstests), inschrijven, vervolgmails op dag 2, 5 en 7, kopersspoor en uitschrijven |
| `tests/5-partners.test.ts` | Aanmelden, inloglink, dashboard met 50% van de netto-opbrengst, terugbetalingen, uitbetaalregels, klikken en beheerpagina |
| `e2e/test-tot-betalen.spec.ts` | Een echte browser vult een test helemaal in, ziet het resultaat, schrijft zich in en komt bij de betaalpagina |

Zelf draaien: `npm test` (snel) en `npm run test:e2e` (browser, ongeveer 2 minuten).
