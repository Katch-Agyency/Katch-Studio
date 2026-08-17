# Katch Studio — Website Production System

Internal production engine for **Katch**, a modern web agency. Katch Studio turns reusable
templates, sections, themes and content into finished client websites — fast.

> Build once → reuse intelligently → customize quickly → deliver faster.

## The core workflow

```
Dashboard → + New Project → Website type → Template → Brand & theme
→ Sections & features → Edit content → Live preview → Save → Export
```

## Design

Dark-first premium interface with a **single controlled accent: `#D7FF4F`** (the official Katch accent).

- **Tokens** live centrally in `src/index.css` (`--ks-*` CSS variables) with RGB channel
  companions (`--ks-*-rgb`) that feed Tailwind's `<alpha-value>` slot — so `/opacity`
  modifiers work everywhere. Light mode swaps values only.
- The accent is used deliberately: primary CTAs, active nav states, toggles, selection,
  focus rings — never as decoration.
- The **official Katch Studio logo** (uploaded asset) is shown as-is on a white tile
  (`src/assets/brand/`, favicon in `public/`), never redrawn or recolored.
- The **Design System page** documents tokens, typography, buttons, cards, inputs,
  badges, alerts and navigation.
- **Command palette**: press `⌘K` / `Ctrl+K` anywhere to navigate, open or duplicate
  projects, create a project, toggle theme, or save the current project (`⌘S`/`Ctrl+S`
  works in the editor too).
- Loading skeletons, useful empty states, and actionable error messages on every page.

## Stack

| Layer      | Choice                                        |
| ---------- | --------------------------------------------- |
| Frontend   | React 18 + TypeScript + Vite 6                |
| Styling    | Tailwind CSS (dark-first, CSS-variable tokens)|
| Icons      | lucide-react                                  |
| Routing    | react-router-dom 7                            |
| State      | React context + pluggable storage adapter     |
| Persistence| **localStorage (default) or Firestore** — env-gated via `VITE_FIREBASE_*`. The storage boundary is isolated in `src/storage/` + `src/app/store.tsx`, so local ↔ cloud switches never touch UI code. Setup guide: [`docs/FIREBASE.md`](docs/FIREBASE.md) |

## Architecture

```
Design System ─→ Reusable Components ─→ Reusable Sections ─→ Templates ─→ Project Config ─→ Client Website
```

- **`src/types/`** — the data model: `Project`, `WebsiteTemplate`, `PageConfig`, `SectionInstance` (with `variant`, `styles`, content), `ThemeConfig`, `BrandConfig`, `FeatureConfig`, `SEO`.
- **`src/features/sections/registry.ts`** — the section system: 29 reusable, theme-aware sections (incl. Products, Categories, Pricing) with smart default content factories, **visual variants** (14 section types have 2–4 layouts) and layers-tree element maps.
- **`src/data/templates.ts`** — 20 templates across 6 categories (Restaurant, Business, Landing, Portfolio, E-commerce, SaaS), each a *composition* of sections with realistic demo content and per-section variants.
- **`src/lib/projectFactory.ts`** — the only path from template → project. Templates are immutable; projects are deep clones. Handles repeated section types and custom (duplicated) templates.
- **`src/website/`** — the **WebsiteRenderer**: `<WebsiteRenderer project={config} />` resolves pages, sections, theme, features and content. The editor preview and the future exported site use this exact renderer — the preview *is* the site.
- **`src/pages/editor/`** — the three-panel production editor: **Structure** (Layers tree + Pages), **live preview** (desktop/tablet/mobile + edit/preview modes), **contextual Inspector** (Design: variant/spacing/background/alignment/width/responsive visibility · Content: field editors focused from the layers tree · Brand · Features · SEO) — with **undo/redo** (Ctrl+Z / Ctrl+Shift+Z), autosave-to-draft and explicit Save.

## PWA

Katch Studio is installable as a standalone app:

- `public/manifest.webmanifest` (standalone, dark theme, maskable icons from the official logo, app shortcuts)
- `public/sw.js` — offline app shell (network-first navigation with cached fallback, stale-while-revalidate assets), versioned update flow
- `src/app/pwa.ts` — install prompt wiring, update-available banner ("A new version is available → Update"), online/offline notice
- Install button appears in the header and Settings only when the browser supports installation
- Service worker registers in production builds only (never interferes with Vite dev/HMR)

## MVP vs. future (honest scope)

**Works today:** dashboard, projects (search/filter/sort/duplicate/delete), the 4-step wizard,
three-panel editor (layers tree, contextual design/content inspector, section variants, spacing,
responsive visibility, undo/redo, edit/preview modes), live preview (desktop/tablet/mobile),
full-screen preview with device controls, multi-page management, full content editing,
theme & brand customization, feature toggles, SEO panel, autosave, project duplication,
template duplication (custom templates), 20 templates incl. E-commerce & SaaS,
configuration + resolved-structure export, RTL/Arabic websites, demo data,
**Firestore sync (optional, env-gated — see `docs/FIREBASE.md`)**, **PWA install + offline shell**.

**Planned (architected, not implemented):** automated scaffold generation (`client-project/`
React/Vite output), Firebase Auth with real accounts & team roles, Firebase Storage for assets,
deployment pipeline, client portal, AI suggestions, template editing, Sentry monitoring.

## Studio mode and client branches

The committed root file [`katch.config.json`](katch.config.json) selects the application mode:

- `"katch_visibility": true` — full Katch Studio (the default on `main`).
- `"katch_visibility": false` — load `public/project.json` and render only the client website.

The editor's **Export → Client Branch** action downloads or copies the current full project as `project.json`. See [`docs/CLIENT_BRANCHES.md`](docs/CLIENT_BRANCHES.md) for the branch workflow, routing and asset rules.

## Studio mode and client branches

The committed root file [`katch.config.json`](katch.config.json) selects the application mode:

- `"katch_visibility": true` — full Katch Studio (the default on `main`).
- `"katch_visibility": false` — load `public/project.json` and render only the client website.

The editor's **Export → Client Branch** action downloads or copies the current full project as `project.json`. See [`docs/CLIENT_BRANCHES.md`](docs/CLIENT_BRANCHES.md) for the branch workflow, routing and asset rules.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build (tsc + vite)
npm run typecheck
npm run test:data  # data pipeline smoke test (demo data, cloning, duplication…)
npm run test:render# mounts the real app in jsdom and walks every route
```

## Demo data

Seeded on first launch (restorable from Settings):

- **Looky Cakes** — Elegant Restaurant template (EN, in progress)
- **Bta3 7awa4y** — Modern Food template, full Arabic RTL content (delivered)
- **Katch Agency Site** — Creative Agency template (in review)

## Structure

```
src/
├── app/                 # store, theme, toast, routing
├── components/          # ui/ (kit), layout/, SectionIcon
├── features/sections/   # the section registry
├── website/             # WebsiteRenderer + all section components
├── pages/               # dashboard, projects, wizard, editor, templates, …
├── storage/             # localStorage & Firestore adapters (env-gated)
├── data/                # templates, themes, fonts, features, demo
├── lib/                 # projectFactory (template → project)
├── types/               # the full data model
├── utils/               # ids, deepMerge, time, downloads, validation
└── assets/demo/         # demo photography (~1.4 MB)
```
