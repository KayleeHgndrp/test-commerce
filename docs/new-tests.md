# Nieuwe tests (elke 2 weken)

Besluit 11 nov 2026: elke twee weken komt er één nieuwe test bij op personalityreveal.com.
Niet vaker, om geen "scaled content" signaal aan Google te geven. Een geplande taak draait
elke woensdag en bouwt alleen een test als "Volgende test" vandaag of eerder is.

Toestemming 13 nov 2026: Studio heeft staande toestemming gegeven om nieuwe tests (en blogs)
zelf te mergen. Een nieuwe test wordt dus direct gemerged zodra alle controles groen zijn.

Volgende test: 2026-11-25

## Wachtrij (bovenste eerst; mag bijgestuurd worden op Search Console-data)

| # | slug (voorstel) | test | categorie | opmerking |
| - | --------------- | ---- | --------- | --------- |
| 2 | ocd | OCD-test (dwang) | screeners | eigen items over controleren, smetvrees, ongewenste gedachten, ordenen; geen gelicentieerde lijst kopiëren (Y-BOCS/OCI-R niet letterlijk) |
| 3 | self-esteem | Eigenwaarde-test | wellbeing | Rosenberg (RSES) is vrij te gebruiken; 10 items embedden als instrument met eigen banden is mogelijk |
| 4 | codependency | Codependency-test / ongezonde relatie | relationships | eigen items |
| 5 | dark-triad | Dark triad-test | personality | dimensies narcisme, machiavellisme, psychopathie; eigen items, niet-veroordelend |
| 6 | introvert-extrovert | Introvert of extravert | personality | uitkomst `top` of dimensies; let op overlap met big-five en 16-types |
| 7 | mental-age | Mentale leeftijd | personality | luchtig; geen pseudo-wetenschap beloven |
| 8 | empath | Empath-test | personality | let op overlap met hsp en eq |

## Gebouwd

| datum | slug | PR |
| ----- | ---- | -- |
| 2026-11-11 | anxiety (GAD-7) | #22 (gemerged 13 nov) |

## Werkwijze per test

1. Volg docs/CONTENT_SPEC.md: definitie met precies 100 items, Engelse tekst, dan alle 31 andere talen.
2. Gevoelige tests (screeners): nooit diagnose, hoge teksten verwijzen naar huisarts of professional.
3. Slug toevoegen aan content/tests.json op een logische plek.
4. `npm run check:content`, `npm run check:dashes` en `npm run build` moeten slagen.
5. Dit bestand bijwerken in dezelfde branch: rij naar "Gebouwd", "Volgende test" 14 dagen later.
6. Branch `tests/<slug>`, PR naar main, KayleeHgndrp als assignee.
7. Wacht tot alle checks op de PR klaar zijn (Vercel-preview "Ready", geen rode checks, geen merge-conflict). Dan zelf squash-mergen. Is iets rood en niet op te lossen: niet mergen en Studio melden.
