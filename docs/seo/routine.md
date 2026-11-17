# SEO-routines

Instellingen en werkwijze voor de geplande taken die de blog en de SEO onderhouden.

## Instellingen

- **Automatisch publiceren:** ja
  (ja = de dagelijkse taak merget zijn eigen pull request naar main zodra `npm run build` en `npm run check:blog` slagen;
  nee = de pull request blijft open tot Studio hem merget)

## Bijsturing 12 nov 2026: kwaliteit boven hoeveelheid

Search Console (30 okt t/m 12 nov): de testpagina's leveren bijna alle klikken en vertoningen,
de blogs samen nog geen 10%. Drie volledige artikelen per week in 32 talen is ook veel tekst in korte
tijd, en Google kan dat als massacontent zien. Daarom vanaf nu:

- **Maandag en vrijdag:** een nieuw artikel zoals hieronder beschreven.
- **Woensdag: GEEN nieuw artikel.** In plaats daarvan één testpagina verbeteren (zie "Testpagina verbeteren").
- Een artikel gaat alleen live in een taal als het daar echt goed leest. Twijfel je over een taal,
  schrijf die dan opnieuw in plaats van een matige versie te publiceren.
- Liever een onderwerp dat aansluit op een test met vertoningen op positie 8 tot 30 dan een los onderwerp.

## Bijsturing 17 nov 2026: alleen focustalen in Google

Sinds 12 nov toont Google de site bijna niet meer. Er is geen handmatige actie; het lijkt een kwaliteitsoordeel
over ~1.600 vergelijkbare pagina's in 32 talen. Daarom (akkoord Studio 17 nov):

- Google ziet alleen de **focustalen** uit `indexedLocales` in `lib/i18n/locales.ts`: en, nl, da, sv, cs, sk, fi.
  De andere talen werken gewoon voor bezoekers, maar hebben noindex en staan niet in de sitemap.
- **Nieuwe artikelen en artikelupdates alleen in de focustalen.** Meer tijd per taal, dus beter werk.
- **Woensdag:** de top 10 tests (disc, personality, 16-types, adhd, big-five, bpd, bipolar, character-strengths,
  autism, trauma) krijgen in de focustalen eigen inhoud: veld `guide` (titel + alinea's, samen 400 tot 600 woorden)
  en veld `faq` (3 tot 5 vragen die echt bij deze test horen) in `messages/{taal}/tests/{test}.json`. Per taal
  geschreven, niet vertaald. Eerst deze top 10 afmaken, daarna de stappen hieronder.
- Elke maandag in `gsc-log.md` noteren hoeveel vertoningen er per dag zijn. Zit dat 2 weken boven 100 per dag,
  stel Studio dan voor één taal terug te zetten (eerst de, dan fr).

## Testpagina verbeteren (woensdag om 6:40)

1. `npm run gsc -- 28 query,page 1000`. Kies de testpagina (`/{taal}/{test}`) met de meeste vertoningen
   op positie 8 tot 30, opgeteld over alle talen. Kijk in `gsc-log.md` welke testpagina's al aan de beurt waren
   en kies een andere als die minder dan 4 weken geleden is verbeterd.
2. Bekijk per taal de echte zoekvragen waarop die pagina verschijnt. Herschrijf in `messages/{taal}/tests/{test}.json`
   `seoTitle` (max 60 tekens), `seoDescription` (max 155 tekens) en `intro` zodat ze die zoekvragen letterlijk
   en natuurlijk beantwoorden. Niet vertalen, per taal de woorden die mensen daar gebruiken.
3. Link vanuit minstens twee bestaande artikelen in elke taal naar deze test waar dat past.
4. `npm run check:content`, `npm run check:dashes` en `npm run build` moeten slagen.
5. Noteer in `gsc-log.md` welke test is verbeterd, met datum.
6. Branch `seo/testpagina-JJJJ-MM-DD`, commit, pull request naar main. Automatisch publiceren = ja: mergen.

## Nieuw artikel (maandag en vrijdag om 6:40)

1. Pak het bovenste onderwerp uit de wachtrij in `topics.md`. Zijn er Search Console-gegevens
   (`npm run gsc -- 28 query 200`), kies dan liever een zoekvraag met vertoningen op positie 8 tot 30.
2. Zoek per taal het zoekwoord dat mensen daar echt gebruiken (zoekresultaten bekijken, niet vertalen).
3. Schrijf het artikel in de focustalen (zie bijsturing 17 nov) volgens `writing-guide.md` (1.800 tot 2.500 woorden, echte voorbeelden, FAQ, link naar de test), met dezelfde `translationKey`.
4. Link naar minstens twee oudere artikelen in dezelfde taal waar dat past.
5. `npm run check:blog` en `npm run build` moeten slagen.
6. Werk `topics.md` bij (van wachtrij naar gepubliceerd).
7. Branch `seo/blog-JJJJ-MM-DD`, commit, pull request naar main. Automatisch publiceren = ja: mergen.

## Wekelijks (maandag)

1. `npm run gsc -- 7 query 250` en `npm run gsc -- 28 page 250`.
2. Pagina's met veel vertoningen en een CTR onder 2%: `seoTitle` en `metaDescription` herschrijven.
3. Zoekvragen op positie 8 tot 30 zonder eigen artikel: bovenaan de wachtrij in `topics.md`.
4. Korte samenvatting in `gsc-log.md` (datum, vertoningen, klikken, opvallende zoekvragen, wat er is aangepast).
5. Werk één bestaand artikel bij (in de focustalen): kies het artikel met de meeste vertoningen op positie 5 tot 20, of zonder data het oudste. Vul aan met wat zoekers missen (nieuwe tussenkop, voorbeelden, FAQ), verbeter titel en meta, voeg interne links toe en zet `updated` op vandaag.
6. Is de datum van "Volgende audit" in `audit-log.md` bereikt: volledige on-page audit (zie hieronder).

## On-page audit (elke 6 weken)

Titels en meta's van alle pagina's in alle talen, koppenstructuur, interne links en weespagina's, structured data,
canonicals en hreflang, sitemap en robots, afbeeldingen en alt-teksten, snelheid. Verbeteringen direct in een
pull request, bevindingen in `audit-log.md`, en de volgende auditdatum 6 weken verder zetten.
