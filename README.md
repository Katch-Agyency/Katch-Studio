# Katch Studio — Website Production System

Internal production engine for **Katch**, a modern web agency. Katch Studio turns reusable
templates, sections, themes and content into finished client websites — fast.

> Build once → reuse intelligently → customize quickly → deliver faster.

## The core workflow

```
Dashboard → + New Project → Website type → Template → Brand & theme
→ Sections & features → Edit content → Live preview → Save → Export
```

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

- **`src/types/`** — the data model: `Project`, `WebsiteTemplate`, `PageConfig`, `SectionInstance`, `ThemeConfig`, `BrandConfig`, `FeatureConfig`, `SEO`.
- **`src/features/sections/registry.ts`** — the section system: 26 reusable, theme-aware sections with smart default content factories.
- **`src/data/templates.ts`** — 12 templates across 4 categories, each a *composition* of sections (never hardcoded websites).
- **`src/lib/projectFactory.ts`** — the only path from template → project. Templates are immutable; projects are deep clones.
- **`src/website/`** — the **WebsiteRenderer**: `<WebsiteRenderer project={config} />` resolves pages, sections, theme, features and content. The editor preview and the future exported site use this exact renderer — the preview *is* the site.
- **`src/pages/editor/`** — the production editor: pages, sections (reorder/duplicate/hide/delete/add), content, brand & theme, features, SEO — with autosave-to-draft and explicit Save.

## MVP vs. future (honest scope)

**Works today:** dashboard, projects (search/filter/duplicate/delete), the 4-step wizard, live
preview (desktop/tablet/mobile), multi-page management, per-page sections, full content editing,
theme & brand customization, feature toggles, SEO panel, autosave, project duplication,
configuration + resolved-structure export, full-screen preview, RTL/Arabic websites, demo data,
**Firestore sync (optional, env-gated — see `docs/FIREBASE.md`)**.

**Planned (architected, not implemented):** automated scaffold generation (`client-project/`
React/Vite output), Firebase Auth with real accounts & team roles, Firebase Storage for assets,
deployment pipeline, client portal, AI suggestions, template editing, Sentry monitoring.

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
