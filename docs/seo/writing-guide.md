# Schrijfregels blog

Deze regels gelden voor elk artikel in elke taal. `npm run check:blog` controleert een deel automatisch.

## Toon

- Schrijf zoals een mens die het onderwerp kent en de lezer serieus neemt. Warm, nuchter, zonder jargon en zonder horoscooptaal.
- Spreek de lezer direct aan (je/jij, du, tu, ty, …) in de vorm die in die taal normaal is voor een tijdschrift.
- Korte zinnen, gemiddeld 12 tot 18 woorden. Korte alinea's van 2 tot 4 zinnen.
- Concrete voorbeelden uit het dagelijks leven: een appje dat blijft liggen, een collega die om een gunst vraagt, een zondagavond vol piekeren.

## Verboden

- **Gedachtestreepjes.** Geen `—` en geen `–`, ook niet in titels, lijstjes of getalbereiken. Gebruik een komma, punt, dubbele punt of "tot". Ook geen los streepje ` - ` als leesteken.
- Opvulzinnen en clichés: "duik in", "ontdek", "in de wereld van vandaag", "het is belangrijk om te weten dat", "kortom", "delve", "unlock", "embark", "a testament to", en hun equivalenten in andere talen.
- Overdreven opsommingen van drie bijvoeglijke naamwoorden, retorische vragen achter elkaar, uitroeptekens.
- Diagnoses of beloftes. Een test geeft inzicht, geen diagnose. Bij gevoelige onderwerpen een korte zin over professionele hulp.
- Verzonnen cijfers of onderzoeken. Noem alleen onderzoek dat echt bestaat (bijv. Bowlby, Ainsworth, Hazan & Shaver) en zonder precieze percentages als je die niet zeker weet.

## Opbouw

1. Eerste alinea beantwoordt de zoekvraag direct, in 2 tot 3 zinnen.
2. 4 tot 7 tussenkoppen (`##`), waarvan minstens één in de vorm van een vraag die mensen echt intypen.
3. Halverwege of aan het eind een natuurlijke link naar de passende test (`/{taal}/{test}`).
4. Korte afsluiting zonder "conclusie"-kop.
5. 3 of 4 FAQ-vragen in de front matter.
6. Lengte: 900 tot 1.400 woorden.

## Lokalisatie

- Vertaal niet woord voor woord. Kies per taal het zoekwoord dat mensen daar zelf gebruiken (nl: "piekeren", niet "overdenken"; de: "Bindungsangst", "Grübeln").
- Slug, titel, `seoTitle` (max 60 tekens) en `metaDescription` (max 155 tekens) in de eigen taal, met het zoekwoord vooraan.
- Pas voorbeelden aan waar nodig (WhatsApp is overal bekend, namen en situaties mogen lokaal).
- Zelfde `translationKey` in alle 32 talen, zodat hreflang klopt.

## Front matter

Zie `content/blog/README.md`. Vul altijd: `title`, `description`, `date`, `author`, `category`, `tags`, `seoTitle`, `metaDescription`, `keywords`, `translationKey`, `relatedTests`, `faq`.
