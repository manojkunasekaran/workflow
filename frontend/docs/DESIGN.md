# Design system

Reference for tokens, appearance, and UI conventions.

## Theme & appearance

- **Color mode:** `themeMode` on user appearance (`light` | `dark` | `system`). Applied on `<html>` by `applyThemeModeToDocument`.
- **Brand accent:** Curated presets in `src/design-system/presets/`. Derived chrome/sidebar tokens via `buildBrandTheme` (no per-user hue/intensity).
- **Density:** `comfortable` | `compact` — CSS variables on `:root`, overridden on `html.density-compact`. Used by `components/ui/*` and `layouts/*`.
- **Apply path:** `AppearanceProvider` loads `GET /users/me/appearance` and org policy from `GET /settings/org-appearance`, then `applyAppearance` + theme classes.
- **Persistence:** Server only (`PATCH /users/me/appearance`). No localStorage appearance keys.

## APIs

| Endpoint | Purpose |
|----------|---------|
| `GET/PATCH /rest/users/me/appearance` | User theme, accent, density, radius |
| `GET /rest/settings/org-appearance` | Org accent, logo, lock (read) |
| `PUT /rest/admin/settings/org-appearance` | Org branding (admin path) |

## Tokens

Semantic colors: `success`, `warning`, `info`, `danger`, `primary`, sidebar tokens in `src/index.css`. Features use semantic Tailwind classes only (enforced by `scripts/check-feature-colors.sh`).

## Studio

Workflow canvas uses `--canvas-*` and studio-specific styles; org/user appearance does not recolor nodes or edges.
