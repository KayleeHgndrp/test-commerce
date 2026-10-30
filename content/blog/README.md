# Blog schrijven

Elke blogpost is één Markdown-bestand: `content/blog/{taal}/{slug}.md`.

- **{taal}** is een taalcode van de site (`nl`, `en`, `de`, …).
- **{slug}** wordt de URL: `content/blog/nl/big-five-uitgelegd.md` → `/nl/blog/big-five-uitgelegd`.
  Gebruik alleen kleine letters, cijfers en streepjes.

Bovenaan staat een blok met instellingen (tussen `---`), daaronder de tekst.
Bij `npm run build` en `npm run dev` wordt alles automatisch verwerkt.
Draait `npm run dev` al, herstart hem dan na het opslaan van een post.

## Instellingen

| Veld | Verplicht | Wat het doet |
|---|---|---|
| `title` | ja | Titel van het artikel (de H1). |
| `description` | ja | Korte samenvatting onder de titel en op de kaart. Ook de meta-beschrijving als `metaDescription` leeg is. |
| `date` | ja | Publicatiedatum, bv. `2026-10-30`. Posts staan op datum, nieuwste eerst. |
| `updated` | | Datum van de laatste grote wijziging. Toont "Bijgewerkt op" en vult `dateModified` voor Google. |
| `author` | | Naam van de auteur. Leeg = sitenaam. |
| `authorUrl` | | Link naar een profiel van de auteur (bv. LinkedIn). |
| `category` | | Categorie, bv. `Persoonlijkheid`. |
| `tags` | | Lijst, bv. `[big five, werk]`. Gebruikt voor gerelateerde artikelen. |
| `image` | | Omslagfoto. Zet bestanden in `public/blog/` en schrijf `/blog/naam.jpg`, of gebruik een volledige `https://`-URL. Liefst 1600×900 of groter. |
| `imageAlt` | | Beschrijving van de foto (belangrijk voor SEO en toegankelijkheid). |
| `draft` | | `true` = concept. Alleen zichtbaar met `npm run dev`, nooit live. |

### SEO

| Veld | Wat het doet |
|---|---|
| `seoTitle` | De `<title>` in Google. Leeg = `title` + " \| Personality Reveal". Houd hem onder ~60 tekens. |
| `metaDescription` | Tekst onder de titel in Google. Leeg = `description`. Houd hem onder ~155 tekens. |
| `keywords` | Lijst met zoekwoorden. |
| `canonical` | Alleen invullen als het artikel eerder op een andere URL stond. Dan wordt het niet in de sitemap opgenomen. |
| `noindex` | `true` = Google indexeert deze post niet. |
| `ogTitle` / `ogDescription` | Afwijkende titel en tekst bij delen op social media. |
| `ogImage` | Afwijkende deelafbeelding (1200×630). Leeg = `image`, anders de standaardafbeelding van de site. |
| `translationKey` | Zelfde waarde in vertalingen van hetzelfde artikel, bv. `big-five-explained` in zowel de `nl`- als de `en`-versie. Koppelt ze voor Google (hreflang). |

### Koppelingen

| Veld | Wat het doet |
|---|---|
| `relatedTests` | Tests die onder het artikel worden aangeraden, bv. `[big-five, career]`. Gebruik de test-slugs uit `content/tests.json`. |
| `related` | Slugs van andere posts (zelfde taal) die als gerelateerd moeten verschijnen. Anders wordt gekozen op categorie en tags. |
| `faq` | Veelgestelde vragen onder het artikel, ook als FAQ-data voor Google: |

```yaml
faq:
  - q: "Vraag?"
    a: "Antwoord."
```

## Tekst opmaken

```markdown
## Tussenkop (H2)          → komt ook in de inhoudsopgave (vanaf 3 tussenkoppen)
### Kleinere kop (H3)

**vet**, *cursief*, [link](/nl/big-five), [externe link](https://example.com)

- opsomming
1. genummerde lijst

> Citaat of uitgelicht blok

![Beschrijving van de afbeelding](/blog/foto.jpg "Optioneel onderschrift")

| Kolom | Kolom |
|---|---|
| cel | cel |
```

Gebruik in de tekst geen `#` (H1): de titel is al de H1.
Link waar het kan naar tests (`/nl/big-five`) en andere artikelen; dat helpt de SEO.

Tijdens het bouwen waarschuwt het script als een SEO-titel of -beschrijving te lang is, een afbeelding geen `imageAlt` heeft of een `relatedTests`-slug niet bestaat.

## Controle voor publicatie

Draai `npm run check:blog` voordat je publiceert. Die faalt als een gepubliceerd artikel gedachtestreepjes (— of –) of
standaard AI-zinnen bevat, of als een `translationKey` niet in alle 32 talen bestaat. Schrijfregels en de
onderwerpenlijst staan in `docs/seo/`.
