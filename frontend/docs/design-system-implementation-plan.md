# Design System & Appearance — Implementation Plan

**Product:** Workflow frontend  
**Stack baseline:** React 19, Vite, Tailwind 3, shadcn/ui (New York), Radix, CSS variables in `src/index.css`  
**Principle:** Reuse and formalize **shadcn/ui + semantic tokens** — do not build a parallel component framework or migrate to MUI/Ant unless leadership explicitly chooses a full UI rewrite.

---

## 1. Goals

| Goal | Success looks like |
|------|-------------------|
| **Enterprise consistency** | Screens use shared tokens and `@/components/ui`; no ad-hoc palette in feature code. |
| **Accessible theming** | Light / dark / system plus brand accent; contrast meets WCAG AA for primary text and controls. |
| **Long-term appearance** | User/org preferences stored predictably; theme applies without flash; workflow canvas stays readable. |
| **Maintainability** | New features have a documented checklist; designers/devs share one token vocabulary. |
| **Optional scale** | Path to per-tenant branding (admin-set accent) without rewriting components. |

## 2. Non-goals (this program)

- Replacing shadcn with MUI, Ant Design, or Fluent in one shot.
- Per-component color pickers across the app.
- Figma-to-code automation (can come later).
- Re-skinning every workflow-studio edge color in Phase 1 (phased alignment only).

---

## 3. Current state (baseline)

- **Theme:** `ThemeProvider` — `light` | `dark` | `system` via `localStorage` (`vite-ui-theme`); toggles `.dark` on `<html>`.
- **Tokens:** HSL CSS variables in `:root` and `.dark` (`--primary`, `--background`, sidebar, canvas, charts).
- **Components:** ~38 files under `src/components/ui/` (shadcn-style).
- **Gap:** Many features use raw Tailwind colors (`emerald-*`, `amber-*`, etc.) — ~25+ files; insights, integrations, workflow config, HTTP method badges, status UI.
- **Studio:** Separate themes in `studioNodeTheme`, `studioEdgeTheme` — intentional but should **reference semantic tokens** where possible.

---

## 4. Target architecture

### 4.1 Layer model

```
┌─────────────────────────────────────────────────────────┐
│  Features (integrations, settings, workflow-studio…)     │
│  → semantic classes only (bg-success/10, text-danger)   │
└───────────────────────────┬─────────────────────────────┘
┌───────────────────────────▼─────────────────────────────┐
│  Composites (optional): PageHeader, DataToolbar, …       │
│  → built from ui/ + tokens                               │
└───────────────────────────┬─────────────────────────────┘
┌───────────────────────────▼─────────────────────────────┐
│  components/ui (shadcn) — Button, Dialog, Table, …         │
└───────────────────────────┬─────────────────────────────┘
┌───────────────────────────▼─────────────────────────────┐
│  Design tokens (CSS variables + Tailwind theme extend)   │
│  + Appearance engine (apply accent / density / radius)   │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Token categories (add to `index.css` + `tailwind.config.js`)

**Brand / action**

- `--primary`, `--primary-foreground`, `--ring`
- `--sidebar-primary`, `--sidebar-ring`

**Semantic (new — required for migration)**

- `--success`, `--success-foreground`, `--success-muted` (background tints)
- `--warning`, `--warning-foreground`, `--warning-muted`
- `--danger` (alias or align with `--destructive`)
- `--info`, `--info-foreground`, `--info-muted`

**Surface**

- `--background`, `--foreground`, `--card`, `--muted`, `--border`
- Optional Phase 2: `--surface-opacity` or dedicated `--card-alpha` for glass (document contrast rules)

**Product-specific (keep, but document)**

- `--canvas-bg`, `--canvas-dots`, `--edge-color`, `--handle-color`, chart `--chart-1`…`5`

**Density (Phase 3)**

- `--spacing-unit` or Tailwind plugin for compact vs comfortable (table row height, button sm default)

All consumer-facing colors in features must map to **semantic** or **product** tokens — never `emerald-500` directly.

### 4.3 Appearance engine (frontend module)

**Location (proposed):** `src/design-system/`

| Module | Responsibility |
|--------|----------------|
| `tokens.ts` | Default token values; preset definitions (JSON-serializable). |
| `applyAppearance.ts` | Writes CSS variables to `document.documentElement`; respects light/dark. |
| `appearanceStore.ts` | Zustand or extend theme context: mode + accent + intensity + optional radius. |
| `presets/` | `default`, `slate`, `blue`, `teal`, `violet`, `high-contrast` — committed HSL sets. |
| `types.ts` | `AppearancePreferences`, validation, defaults. |

**Persistence**

| Phase | Storage | Scope |
|-------|---------|--------|
| 1 | `localStorage` (`workflow-appearance`) | Browser |
| 2 | Same + export/import JSON file | User backup |
| 3 | API `GET/PATCH /users/me/preferences` | Cross-device |
| 4 | API org settings | Tenant admin branding |

**Application order on load**

1. Read saved preferences (or defaults).
2. Resolve effective mode: `light` | `dark` from user + `system`.
3. Apply base preset for that mode.
4. Apply accent overrides (hue shift on primary family only in Phase 1).
5. Avoid FOUC: inline script in `index.html` optional for mode-only (Phase 2 polish).

### 4.4 Theming mechanics (Phase 1 accent)

- Keep tokens as **`H S L` without `hsl()`** (current shadcn pattern).
- Accent slider: user `hue` (0–360) → recompute `--primary`, `--ring`, `--sidebar-primary` from preset S/L.
- **Intensity:** adjust S and L within safe bounds (clamp so contrast checker passes).
- **Transparency (Phase 2):** adjust L of `--card` / `--muted` or use `color-mix(in srgb, …)` for overlays — not global `opacity` on `body`.

Use **tweakcn.com** (or shadcn theme export) to generate preset baselines; commit exported CSS snippets into `presets/`, do not depend on tweakcn at runtime.

---

## 5. UI/UX — Appearance settings

**Place:** Settings → **Appearance** (extend existing theme buttons).

| Control | Phase | Behavior |
|---------|-------|----------|
| Mode | Exists | Light / Dark / System |
| Accent preset | 1 | Chips: Default, Blue, Teal, Violet, … |
| Hue fine-tune | 1 | Slider ± optional |
| Intensity | 1 | Subtle ↔ Bold |
| Radius | 2 | sm / md / lg → `--radius` |
| Density | 3 | Comfortable / Compact |
| Reset | 1 | Restore preset defaults |
| Export / Import | 2 | JSON for power users |

**Live preview:** small mock card (button, badge, input) in the panel — no full-app iframe required.

**Enterprise:** disable user accent if org policy locks branding (Phase 4).

---

## 6. Phased roadmap

### Phase 0 — Foundation & governance (1–2 weeks)

**Deliverables**

- [x] This plan reviewed by team; owner assigned (Design + FE lead).
- [x] `frontend/docs/DESIGN.md` — short living doc: token list, button variants, when to use Dialog vs Sheet, icon sizes.
- [x] ESLint rule or `grep` CI check (optional): flag new `bg-emerald-|bg-amber-|text-red-[0-9]` in `src/features` (allowlist `studioEdgeTheme` paths initially).
- [x] Inventory: spreadsheet or markdown table of hardcoded color files (from audit).

**Acceptance**

- New PRs reference DESIGN.md in template (optional checkbox).

---

### Phase 1 — Semantic tokens + accent presets (2–3 weeks)

**Deliverables**

- [x] Extend `index.css` + Tailwind `theme.extend.colors` for `success`, `warning`, `info`, `danger` (muted variants).
- [x] Update `status-badge.tsx`, `InsightsKpiCard`, integration status chips, HTTP method badges in Action/Trigger builders to semantic tokens.
- [x] `appearanceStore` + `applyAppearance`; integrate with existing `ThemeProvider` (single provider wrapper or merged context).
- [x] Settings UI: presets + hue/intensity; persist `localStorage`.
- [x] Unit tests: `applyAppearance` computes valid HSL; contrast helper tests for preset bounds.
- [x] Playwright: appearance panel changes `primary` computed style; dark mode still works.

**Acceptance**

- Zero new raw palette classes in touched files.
- Lighthouse/a11y: no regression on Settings and Integrations list.
- All existing theme E2E tests pass.

**Migration batch 1 (priority files)**

- `components/ui/status-badge.tsx`
- `features/integrations/components/insights/*`
- `features/settings/connectors/ActionBuilder.tsx`, `TriggerBuilder.tsx`
- `features/integrations/IntegrationDetailPage.tsx`, `IntegrationCard.tsx`, `IntegrationListRow.tsx`

---

### Phase 2 — Full feature migration + surface tuning (3–4 weeks)

**Deliverables**

- [x] Migrate remaining ~20 files off raw Tailwind palette (workflow config, executions, MCP, connections).
- [x] Workflow studio: map `studioNodeTheme` / edge colors to semantic or documented canvas tokens (`studioCanvasTokens.ts`).
- [x] Radius + optional card softness (radius preset on `--radius`; density / high-contrast / focus UI variants).
- [x] Export/import appearance JSON; validate schema (typed parser in `validateAppearance.ts`; Zod optional later).
- [x] Add missing shadcn components via CLI only if needed: `StatusBadge` covers badge; native range for slider; toast deferred.

**Acceptance**

- CI grep/check passes on `src/features` (no unallowlisted color utilities).
- Visual regression baseline (Playwright screenshots on 3 key pages) optional but recommended.

---

### Phase 3 — Advanced themes & catalog (2–3 weeks)

**Deliverables**

- [x] Presets: **High contrast**, **Compact density**, **Focus** (UI variant toggles on `<html>`).
- [x] Component catalog: in-app **Design catalog** tab in Settings (Storybook optional later).
- [x] Document chart token usage for insights (align `--chart-*` with semantic palette) — see DESIGN.md.

**Acceptance**

- Designers can browse Storybook without running full app.
- Compact mode reduces default table/button sizes via token/class strategy (documented).

---

### Phase 4 — Enterprise multi-tenant branding (backend + FE, 3–5 weeks)

**Deliverables**

- [x] API: org `appearance` JSON (allowed: preset id, logo URL, lock accent; not arbitrary CSS).
- [x] FE: on load, merge org overrides over user prefs (`mergeWithOrgPolicy`, `AppearanceProvider`).
- [x] Admin UI stub in Settings → Organization tab.

**Acceptance**

- Security review: no arbitrary CSS injection from API — whitelist keys only.
- Fallback to defaults if API fails.

---

### Phase 5 — Optional analytics UI (as needed)

- [x] Evaluate **Tremor** — **deferred**; current insights use `--chart-*` and semantic badges; revisit if dashboard scope grows.

---

## 7. shadcn/ui operational rules

1. **Add components:** `npx shadcn@latest add <component>` — do not copy-paste from random repos.
2. **Customize** in `components/ui/*` only; use `className` extension via `cn()` in features.
3. **Version:** Pin shadcn schema in `components.json`; quarterly review for Radix/React compatibility.
4. **Icons:** Lucide only (already standard); size via `[&_svg]:size-4` patterns in ui components.

---

## 8. Testing strategy

| Layer | What |
|-------|------|
| Unit | `applyAppearance`, preset merge, contrast clamp |
| Component | Button/StatusBadge variants in light + dark |
| E2E | Settings appearance; theme persistence reload |
| Visual | Optional: Playwright screenshot compare on Home, Integrations, Workflow studio |
| a11y | axe in CI on Settings + one list page |

---

## 9. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Partial migration looks inconsistent | Phase 1 batch highest-traffic UI first; ban new violations via CI |
| Accent breaks contrast | Clamp S/L; test presets; show warning in UI if contrast fails |
| Studio canvas unreadable with strong accent | Canvas tokens decoupled from `--primary`; document in DESIGN.md |
| FOUC on load | Inline critical script for mode; defer accent apply by one frame if needed |
| Org branding XSS | Whitelist API fields; no raw CSS strings from server |

---

## 10. Decision log (recommended)

| ID | Decision | Rationale |
|----|----------|-----------|
| D1 | shadcn/ui remains system of record | Already integrated; enterprise SaaS norm |
| D2 | Semantic tokens before user transparency | Transparency needs surface token model first |
| D3 | localStorage before API | Faster ship; API in Phase 4 |
| D4 | No runtime dependency on tweakcn | Export presets at build/docs time only |

---

## 11. Suggested team split

| Role | Phase 1–2 focus |
|------|-----------------|
| FE lead | Appearance engine, ThemeProvider merge, CI rules |
| FE | Feature migration batches |
| Design | Preset palette, contrast sign-off, Storybook stories |
| QA | E2E + accessibility on Appearance |

---

## 12. Immediate next steps (week 1)

1. Review and approve this plan (adjust phases to release train).
2. Create `frontend/docs/DESIGN.md` (token table + do/don’t).
3. Implement semantic colors in `index.css` + Tailwind + `status-badge`.
4. Spike `applyAppearance` with one preset and wire Settings preview card.
5. Schedule migration batch 1 PR (insights + integration badges).

---

*Document version: 1.0 — design system & appearance program.*
