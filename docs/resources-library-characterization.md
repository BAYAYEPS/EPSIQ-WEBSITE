# EPSIQ Resources characterization — baseline 1335bd6

Recorded before the Library Engine V2 implementation.

- Hubs: `/ressources/` and `/ar/ressources/`, with the EPSIQ header/footer, `styles.css`, and `ressources.css`.
- Published canonical details: `cahier-de-textes-eps-2026-2027` and `cahier-de-controle-et-devaluation-eps-2026-2027`, both in French and Arabic route namespaces.
- Each detail page has a unique title, description, canonical, reciprocal FR/AR hreflang, x-default, `CreativeWork` JSON-LD, breadcrumb, direct download, local cover/preview images, and a language switch.
- General-resource documents use `/downloads/...` PDF routes. Covers and previews are local `/assets/resources/...` files.
- Arabic details use `lang="ar"`, `dir="rtl"`, and the existing `rtl-site` convention. The common CSS is `styles.css`; no resource detail imports `ressources.css`.
- The hubs retain an explicitly unavailable Demi-fond collection. It is not a published resource and is excluded from the catalog.
- Existing legacy `cahier-de-controle-et-de-notes` and `cahier-de-suivi` pages are noindex redirects, not canonical catalog resources.
