# Hardcoded palette inventory (Phase 2 closeout)

**Feature TSX:** `scripts/check-feature-colors.sh` passes (semantic tokens in UI).

**Allowlist (not Tailwind palette in TSX):**

| Area | Notes |
|------|--------|
| `task-type-schema/plugins/*.ts` | `accentColor` hex for canvas node icons |
| `workflow/WorkflowJsonEditor.tsx` | Zinc code editor surface (intentional code chrome) |
| `index.css` | Studio handle hex overrides for React Flow |

**Phase 3+:** `studioNodeTheme` / edge colors alignment, radius control, Storybook.

Regenerate TSX scan:

```bash
./frontend/scripts/check-feature-colors.sh
```
