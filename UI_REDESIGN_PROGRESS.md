# UI Redesign Progress

Design-system reference and redesign history for the DermaHealth frontend. For the business-logic/domain-layer history, see `IMPLEMENTATION_PROGRESS.md`. For verification methods and honesty caveats, see `FINAL_VERIFICATION.md`.

## Status

The visual system below (Ant Design v6 + Highcharts + React Flow + dnd-kit + lucide-react, medical-blue tokens) is the **accepted baseline**. Per explicit instruction, it was not redesigned again in the Phase 3 hardening pass — Phase 3 only fixed runtime safety, performance, and leftover inconsistencies within this same system (see "Phase 3 changes" below).

## Design tokens

Defined in `src/index.css` (CSS custom properties) and mirrored into `src/theme/antdTheme.ts` (AntD `ConfigProvider` tokens) so AntD components don't read as default/generic.

| Token group | Examples | Notes |
|---|---|---|
| `--medical-blue-50…950` | `--medical-blue-700: #1e5e9e` (primary), `--medical-blue-600: #2878c8` | Replaces AntD's default `#1677ff` everywhere in first-party code |
| `--surface-*` | `--surface-page`, `--surface-card`, `--surface-subtle`, `--surface-selected` | Card/page/hover-state backgrounds |
| `--text-*` | `--text-primary`, `--text-secondary`, `--text-muted` | |
| `--border-*` | `--border-default`, `--border-subtle` | |
| `--radius-xs…xl` | 6/8/10/... px | Deliberately small — the pre-redesign version used oversized radii that read as "plastic" |
| `--shadow-card` | flat, low-blur | Replaces the earlier soft/diffuse card shadows |

Legacy variable names (`--primary`, `--bg`, `--card`, etc.) are aliased to the new tokens so any code that wasn't touched during the redesign still inherits the palette automatically.

## Libraries

| Library | Used for | Notes |
|---|---|---|
| `antd` ^6.5.0 | All interactive components (Table, Form, Card, Modal, Result, Empty, Steps, Tabs, etc.) | Native React 19 support, no compat patch needed |
| `highcharts` ^13 + `highcharts-react-official` | All charts | Centralized module registration in `src/charts/highchartsSetup.ts` — pages never call `Highcharts.setOptions` themselves |
| `@dnd-kit/core` + `/sortable` + `/utilities` | Kanban boards (Work Queue, Records treatment plan), step reordering (Workflow Template Editor) | Real pointer+keyboard drag, not a static list |
| `@xyflow/react` | BPM template/instance graphs | Custom node components, auto-layout by prerequisite depth (`src/domain/flowLayout.ts`) |
| `lucide-react` | Every icon in the app | Sole icon system — `@ant-design/icons` was evaluated and removed (zero imports found; still available transitively via `antd`'s own dependency) |

## Phase 2 — original redesign (prior session segment)

Replaced hand-rolled visuals (inline-styled divs, emoji-as-icons, hand-drawn SVG charts, native-HTML Kanban, ASCII workflow diagrams) across every page with the component/library set above. Full per-page breakdown is in `IMPLEMENTATION_PROGRESS.md`'s "Phase 2" section. Known trade-off at the end of Phase 2: a single ~2.3MB (gzip ~740kB) eager bundle, no code-splitting.

## Phase 3 — hardening pass (this pass)

Did not touch colors, spacing, component choice, or layout for any page. What it did change, visually:

- **Removed 3 pastel gradient placeholders** that had survived the Phase 2 redesign as unnoticed leftovers: `Progress.tsx`'s before/after comparison cards (was `linear-gradient(135deg, #fef3c7, #fde68a)` / `#dbeafe, #bfdbfe` — Tailwind-style amber/blue pastels), its photo-gallery cards (was a per-index HSL pastel gradient), and `AIAnalysis.tsx`'s annotated-image placeholder (was `linear-gradient(135deg, #dfe9f4, #c8dcef)`). All three are now flat `var(--surface-subtle)` with a `var(--border-default)` edge, matching every other placeholder/empty-state surface in the app.
- **Deleted 4 orphaned stylesheets** (`Dashboard.css`, `Records.css`, `AIAnalysis.css`, `Appointments.css`) that were never imported by any component (confirmed via grep) but still contained pre-redesign pastel/plastic rules (`#ffd4c4`→`#ffb8a0` gradients, `#92400e` amber text, etc.) — dead weight in the repo, zero visual effect either way since nothing loaded them.
- **Removed dead hardcoded default-AntD-blue** (`#1677FF`) from `mockMedicineReminders`/`mockTimeline` in `src/data/mockData.ts` — this data was never actually rendered (confirmed by tracing `Prescriptions.tsx`), so this is dead-data cleanup, not a rendering fix.
- **Real Highcharts 3D**, per explicit request ("các biểu đồ dùng của highchart 3d đi") — Dashboard/Progress/Reports column charts converted from flat 2D to 3D (`chart3dDefaults`: `alpha: 12, beta: 18, depth: 60`), plus a new 3D donut chart on Reports. `highcharts-3d` module registration added to the shared setup file. Responsive rule already existed in the shared theme to flatten the 3D angle on narrow viewports (`maxWidth: 640` → `alpha: 6, beta: 6, depth: 40`).
- **Upgraded 5 plain-text/no-feedback states to proper AntD components**: two React Flow not-found guards → `Result` with icon+action button; one zero-step/zero-task workflow canvas → `Empty`; `DoctorReview.tsx`'s "no open encounter" → `Empty`; three access-denied `Result` screens gained a "Về trang tổng quan" action button where none existed before.
- **Accessible drag handles** — all three `GripVertical` drag-handle spans (Records Kanban, Work Queue Kanban, Workflow step list) gained `role="button" tabIndex={0} aria-label="..."` naming the specific item being dragged; previously they were icon-only with no accessible name.
- **Route-level loading skeleton** replaces a plain "Loading..." text equivalent (there wasn't one before — pages just popped in) — now every lazy route shows an AntD `Skeleton` inside the content area during the `import()` fetch, and a full-page `Spin` for the two pre-shell routes.

No card border-radius, shadow, color palette, icon system, or component library choice changed in this pass — see `FINAL_VERIFICATION.md` §7 for what was and wasn't actually visually confirmed (nothing was — no browser tool in this sandbox; the above is a source-level description of the CSS/props that changed, not an observed render).
