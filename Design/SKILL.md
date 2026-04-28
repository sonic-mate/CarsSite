---
name: vostok-autoimport-design
description: Use this skill to generate well-branded interfaces and assets for Vostok AutoImport (Восток АвтоИмпорт), a premium importer of cars from Japan, China and Korea. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping marketing pages, catalog screens, calculators, and trust-driven CTAs.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick reference

- **Vibe:** premium, restrained, dark-accented light theme. Lexus / Genesis territory. No gradients-on-gradients, no emoji, no playful copy.
- **Phone CTA is sacred:** `8 800 101 29 18` must be visible on every screen, ideally in the header and footer. The whole point of this site is to drive a phone call.
- **Tokens:** see `colors_and_type.css`. Off-white paper (`#F5F3EE`) + carbon ink (`#0F1115`) + wine accent (`#8A2B2B`) + sand gold (`#C8A45C`).
- **Type:** Unbounded 600 (display, UPPERCASE, ≤6 words, full Cyrillic support), Manrope (body, headings), JetBrains Mono (numerics).
- **UI kit:** `ui_kits/website/` — Header, Footer, Home, Catalog, CarDetail, Calculator, Process. Components in `components.jsx`.
- **Assets:** `assets/logo.svg`, `assets/logo-mark.svg`, `assets/flags/{japan,china,korea}.svg`.
- **Icons:** Lucide-style 1.5px stroke, 22–24px. Inline as SVG via the `<Icon>` component.

## Hard rules

- Use «Вы» not «ты». No emoji. No exclamation marks except the phone CTA itself.
- Numbers always with non-breaking spaces: `1 247 авто`, `2 350 000 ₽`.
- Prices in Bebas Neue, accent color, with currency symbol `₽`.
- Country tabs: Japan / China / Korea — flags from `assets/flags/`.
- Hero photography: cars on dark background with light radial vignette. Never on white.
- Cards: 8px radius, 1px `--ink-85` border, `--shadow-1` rest / `--shadow-2` hover, lift 2px on hover.
- All motion on `cubic-bezier(0.2, 0.8, 0.2, 1)`. No bounces.

## Substitutions to flag to the user

- **Fonts** are Google substitutes (Unbounded / Manrope) for premium PP-style families. Ask for licensed TTFs.
- **Logo** is a placeholder wordmark. Ask for the real logo.
- **Icons** are Lucide-style hand-rolled SVG. Confirm or replace with a brand set.
- **Trust numbers** (1 247 авто, 8 лет) are placeholders.
