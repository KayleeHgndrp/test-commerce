# SEO-routines

Instellingen en werkwijze voor de geplande taken die de blog en de SEO onderhouden.

## Instellingen

- **Automatisch publiceren:** nee
  (ja = de dagelijkse taak merget zijn eigen pull request naar main zodra `npm run build` en `npm run check:blog` slagen;
  nee = de pull request blijft open tot Studio hem merget)

## Dagelijks (elke ochtend)

1. Pak het bovenste onderwerp uit de wachtrij in `topics.md`. Zijn er Search Console-gegevens
   (`npm run gsc -- 28 query 200`), kies dan liever een zoekvraag met vertoningen op positie 8 tot 30.
2. Zoek per taal het zoekwoord dat mensen daar echt gebruiken (zoekresultaten bekijken, niet vertalen).
3. Schrijf het artikel in alle 32 talen volgens `writing-guide.md`, met dezelfde `translationKey`.
4. Link naar minstens twee oudere artikelen in dezelfde taal waar dat past.
5. `npm run check:blog` en `npm run build` moeten slagen.
6. Werk `topics.md` bij (van wachtrij naar gepubliceerd).
7. Branch `seo/blog-JJJJ-MM-DD`, commit, pull request naar main. Automatisch publiceren = ja: mergen.

## Wekelijks (maandag)

1. `npm run gsc -- 7 query 250` en `npm run gsc -- 28 page 250`.
2. Pagina's met veel vertoningen en een CTR onder 2%: `seoTitle` en `metaDescription` herschrijven.
3. Zoekvragen op positie 8 tot 30 zonder eigen artikel: bovenaan de wachtrij in `topics.md`.
4. Korte samenvatting in `gsc-log.md` (datum, vertoningen, klikken, opvallende zoekvragen, wat er is aangepast).
5. Is de datum van "Volgende audit" in `audit-log.md` bereikt: volledige on-page audit (zie hieronder).

## On-page audit (elke 6 weken)

Titels en meta's van alle pagina's in alle talen, koppenstructuur, interne links en weespagina's, structured data,
canonicals en hreflang, sitemap en robots, afbeeldingen en alt-teksten, snelheid. Verbeteringen direct in een
pull request, bevindingen in `audit-log.md`, en de volgende auditdatum 6 weken verder zetten.
