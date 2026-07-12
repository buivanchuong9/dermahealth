# Final Verification — Phase 3 Production Hardening Pass

This document states, per claim, exactly how it was verified. It intentionally does not use unqualified phrases like "all routes verified" — see the legend below and the per-row method column in every table.

## Verification-method legend

| Code | What it actually proves | What it does NOT prove |
|---|---|---|
| **TS** | `npx tsc -b --noEmit` passed against the file(s) in question | Runtime correctness, that the code ever executes |
| **ESLint** | `npx eslint .` (full repo) passed, 0 errors/warnings | Runtime correctness |
| **Build** | `npm run build` (`tsc -b && vite build`) succeeded and the expected chunk was emitted | The chunk works when loaded, that it's in the right place at runtime |
| **HTTP** | `curl` against `vite preview` returned `200` for the path | **Nothing about what rendered.** This repo is a client-side SPA with a catch-all `index.html` — every path, including deliberately invalid ones, returns 200 with the identical document. Proven below by curling a nonexistent template ID and getting 200 back, same as a real one. |
| **Source** | The actual component/service code was read line-by-line (by me or a research subagent working from the live repository, not from memory/assumption) and the described behavior is what the code does | That a browser actually produces that behavior — no JS engine executed this code during verification |
| **Not verified** | No check was performed | — |

**No browser-render or browser-interaction verification was performed anywhere in this document.** This sandbox has no headless-browser/Playwright/screenshot tool, and none was installed. Every claim below is TS/ESLint/Build/HTTP/Source only. Where the original 14-point brief asked for interaction behavior (click X → Y happens on screen), the verification is "Source: the onClick handler calls service Z, which does W" — not "confirmed by clicking it."

---

## 1. Canonical active-route table

All 20 leaf routes from `src/App.tsx`, plus the 2 redirects. "Required role" is TRUE page-level enforcement (a hard `return <Result/>` block) unless marked otherwise — see §3 for why most routes are not enforced this way.

| Path | Lazy component | Required role (enforcement) | Primary data source | Loading/Empty/Error states | Invalid-ID behavior | Method |
|---|---|---|---|---|---|---|
| `/` | — (redirect to `/login`) | none | — | — | — | Source, HTTP |
| `/login` | `pages/Login.tsx` | none | none — form `onFinish` just calls `nav('/app/dashboard')`, no auth check exists | none needed (static form) | n/a | Source, HTTP |
| `/app` | — (redirect to `/app/dashboard`) | none | — | — | — | Source, HTTP |
| `/app/dashboard` | `pages/Dashboard.tsx` | none (branches by role, doesn't block: `role !== 'patient'` → operational view, else patient view) | Staff view: `encounterRepository`, `medicalRecordRepository.records()`, `workflowRepository.tasks()`, `carePlanRepository.alerts()`, `notificationRepository`, `integrationRepository.connections()`. Patient view: **hardcoded constants, no repository** | Chart has an `Empty` guard (unreachable in practice — feeding array is a non-empty constant); appointment/record lists have no `Empty` guard | n/a | Source, HTTP |
| `/app/appointments` | `pages/Appointments.tsx` | none | **None — fully hardcoded** (`DOCTORS`, time-slot constants); "Xác nhận đặt lịch" only flips local `useState`, no service call, nothing persists | n/a (no repository-backed list) | n/a | Source, HTTP |
| `/app/ai-analysis` | `pages/AIAnalysis.tsx` | none (Sidebar hides the link for non-patients, page itself doesn't block) | `aiAssessmentService` (real: `validateIntake`, `evaluateRedFlag`, `requestAssessment`) | `Result` for emergency/insufficient-data paths | n/a | Source, HTTP |
| `/app/doctor-review` | `pages/DoctorReview.tsx` | **Yes** — `if (role !== 'doctor') return <Result .../>` | `encounterRepository`, `aiAssessmentRepository`, `clinicalOrderRepository.orders()` | `Result` (role-denied, now with a "Về trang tổng quan" button); `Empty` (no open encounter, upgraded this pass from plain text) | n/a | Source, HTTP |
| `/app/journey` | `pages/Journey.tsx` | none (conditional staff-only panel via `role !== 'patient'`, page not blocked) | `encounterRepository`, `clinicalOrderRepository.*`, `workflowRepository.*`, `medicalRecordRepository.records()`, `carePlanRepository.*` | Explicit "no encounter" card; explicit "no outstanding tasks" text | n/a | Source, HTTP |
| `/app/records` | `pages/Records.tsx` | Partial — "Kế hoạch điều trị" tab: none (local mock Kanban, see §2). "EMR" tab: break-glass gate for roles outside `patient/doctor/medical_administrator`, with a mandatory-reason form and a "Về trang tổng quan" escape button (added this pass) | EMR tab: `encounterRepository`, `medicalRecordRepository.*`, `clinicalOrderRepository.*`, `workflowRepository.tasks()`, `auditRepository`. Kanban tab: **local `useState`, not connected to any repository** | "Chưa có lượt khám nào" text guard | n/a | Source, HTTP |
| `/app/profile` | `pages/Profile.tsx` | none | `patientService.getPrimaryDoctor()` (one-shot call, not `useStore`-reactive); rest is hardcoded constants | Null-coalesce fallback for missing doctor, not a list-empty state | n/a | Source, HTTP |
| `/app/prescriptions` | `pages/Prescriptions.tsx` | none | `mockPrescriptions`, `mockMedicineReminders` from `src/data/mockData.ts` — **not repository-backed**; "taken" toggle is local `useState` only | n/a | n/a | Source, HTTP |
| `/app/progress` | `pages/Progress.tsx` | none | `mockProgressData`, `mockProgressPhotos` from `src/data/mockData.ts` — **not repository-backed** | Chart `Empty` guard (unreachable, same reason as Dashboard) | n/a | Source, HTTP |
| `/app/care` | `pages/Care.tsx` | none (`canApproveRequests`/`canCloseAlerts` gate individual buttons, not the page) | `carePlanRepository.plans()/.activities()/.alerts()/.encounterRequests()` — real, except a hardcoded "Liên hệ bác sĩ" card and `CAMPAIGNS` const | `Empty` on the "cần thực hiện" list only; completed/alerts/requests sections have no guard | n/a | Source, HTTP |
| `/app/reports` | `pages/Reports.tsx` | none | **Entirely hardcoded** (`mockProgressData` + several in-file constants) — zero `useStore` calls | Chart `Empty` guards present but unreachable (constant is never empty) | n/a | Source, HTTP |
| `/app/workflows/templates` | `pages/workflows/WorkflowTemplates.tsx` | none (`canDesign` gates the create form, not the page) | `workflowRepository.templates()/.versions()` — real | "Chưa có quy trình nào" text guard | n/a | Source, HTTP |
| `/app/workflows/templates/:id` | `pages/workflows/WorkflowTemplateEditor.tsx` | none (`canDesign` gates edit controls; read-only `Alert` shown otherwise) | `workflowRepository.templates()/.versions()` — real | `Empty` for zero-step draft and for a template with no draft (upgraded this pass) | **Fixed this pass**: invalid/missing `id` → AntD `Result` (`SearchX` icon, echoes the bad id, button back to `/app/workflows/templates`) instead of the old plain-text card | Source, HTTP (§3 has the actual curl proof) |
| `/app/workflows/instances/:id` | `pages/workflows/WorkflowInstancePage.tsx` | none | `workflowRepository.instances()/.tasks()` — real | `Empty` for a zero-task instance's React Flow canvas (added this pass); `Empty` for "no task selected" in the inspector | **Fixed this pass**: invalid/missing `id` → AntD `Result` (`SearchX` icon, echoes the bad id, button back to `/app/work-queue`) | Source, HTTP |
| `/app/work-queue` | `pages/WorkQueue.tsx` | none | `workflowRepository.tasks()`, `encounterRepository` — real; Kanban and the "other tasks" `Table` read the same store (confirmed, see §4) | `Empty` per empty Kanban column | n/a | Source, HTTP |
| `/app/audit` | `pages/AuditViewer.tsx` | **Yes** — `role !== 'medical_administrator' && role !== 'system_administrator'` | `auditRepository` — real | Denied `Result` now has a "Về trang tổng quan" button (added this pass) | n/a | Source, HTTP |
| `/app/integrations` | `pages/Integrations.tsx` | **Yes** — `role !== 'system_administrator' && role !== 'medical_administrator'` | `integrationRepository.connections()/.messages()` — real | Denied `Result` now has a "Về trang tổng quan" button (added this pass) | n/a | Source, HTTP |
| `/app/settings` | `pages/SettingsPage.tsx` | none | Consent section: `consentRepository` — real, via `patientService.setConsent` (no try/catch, no message feedback — pre-existing gap, not introduced this pass). Notification/privacy/device toggles: **local `useState`, never persisted** | none | n/a | Source, HTTP |
| `/app/support` | `pages/Support.tsx` | none | **Entirely hardcoded** (`FAQS`, `CHANNELS`); "Gửi yêu cầu" only clears local state, no service call | n/a | n/a | Source, HTTP |

## 2. RBAC honesty note

Only **3 of 19** in-app routes (`DoctorReview`, `AuditViewer`, `Integrations`) enforce a hard page-level role block. Every other role-scoped page relies solely on `Sidebar.tsx` hiding the nav link for roles that shouldn't see it — that is a **client-side convenience gate, not access control**: typing the URL directly, or clicking a `Link`/`navigate()` call that another page already produces (e.g. `WorkQueue`'s task links), bypasses it completely. There is no backend in this prototype, so there is nothing to enforce access control server-side either. This was true before this pass and remains true after it; it is listed here, not fixed, because closing it would mean adding new authorization logic to ~16 pages, which is feature work outside a hardening pass's "don't touch business rules" scope. (Source)

## 3. Dynamic-route scenario verification

Both dynamic routes (`/app/workflows/templates/:id`, `/app/workflows/instances/:id`) traced against every scenario in the brief:

| Scenario | `WorkflowTemplateEditor` (`:id`) | `WorkflowInstancePage` (`:id`) | Method |
|---|---|---|---|
| Valid, real seeded ID (`WFT-DERM` / `WFI-1001`) | Renders the template + draft/published version history | Renders the task graph + inspector | Source, HTTP (curled both, got 200 — see caveat in legend) |
| Missing ID (route visited with no `:id` segment — not reachable via the router's own path pattern, but guarded anyway) | `!id` → `Result` | `!id` → `Result` | Source |
| Unknown/never-existed ID (e.g. `NOPE-999`) | `template` lookup is `undefined` → `Result` with the literal bad id interpolated into the Vietnamese message | Same pattern via `instance` lookup | Source. Also HTTP-curled `/app/workflows/templates/NOPE-999` against the production build → `200`, identical body to the valid-ID request, **proving the HTTP layer cannot distinguish valid from invalid IDs** — the `Result` guard is the only thing that does, and that was verified by reading the code, not by rendering it |
| Deleted entity (ID existed, then removed) | Same code path as "unknown ID" — the guard is `!template`, not "ID never existed" vs "ID was removed"; no distinction is needed or made | Same | Source |
| Back-navigation / refresh with persisted `localStorage` | Both `id` and the entity lookup are re-derived from `useParams()`/`useStore()` on every mount — a refresh re-reads `localStorage` through the Phase-3 schema-version/integrity guard (§5 of `IMPLEMENTATION_PROGRESS.md`) before any component renders, so a refresh can only ever see a consistent state (either the persisted one, or a full reset to seed if it was corrupt) | Same | Source |
| Unauthorized role | Neither page hard-blocks by role; `canDesign` on the template editor degrades to a read-only `Alert`, not a denial | No role restriction on the instance page at all | Source |
| Incompatible version (e.g. a template with `templateId` pointing at a version that was archived) | Not applicable to the not-found guard — `templateVersions`/`draft` are derived by filter+sort from `versions`, so a template with only archived versions simply shows no draft (`Empty`, per §1), it does not crash | n/a | Source |

No case above falls back to "the first entity in the list" or silently mutates an unrelated entity — confirmed by reading the guard conditions (`!id || !template` / `!id || !instance`), which only ever compare against the exact `id` from the URL. (Source)

## 4. dnd-kit shared-state verification

`WorkQueue.tsx` renders both a drag-and-drop Kanban (`DndContext`/`useDraggable`/`useDroppable`) and an AntD `Table` ("Tất cả tác vụ khác") on the same page. Both read from the single `const tasks = useStore(workflowRepository.tasks())` call at the top of the component (line 95) — the Kanban's columns and the table's `otherTasks` are both `.filter()` derivations of that same `tasks` array, so a drag-driven mutation (which goes through `workflowService.*` → `workflowTaskStore.upsert()` → `notify()`) re-renders both views from the same updated snapshot. There is no second, independent read of task data anywhere in the file. (Source — confirmed by reading `WorkQueue.tsx` in full this pass.)

`Records.tsx`'s treatment-plan Kanban is a separate case: it is **not** connected to `workflowRepository` at all — it's local `useState` seeded from an in-file `INIT` constant, with no corresponding Table view to compare against. This was true before this pass; it is a pre-existing scope gap (documented in `FE_OVERVIEW.md` from an earlier phase), not something this hardening pass introduced or was asked to convert to live data (that would be new feature work, not hardening).

## 5. Error boundary vs. local error handling

`src/layouts/AppErrorBoundary.tsx` only catches uncaught **render-time exceptions** (a component throwing during render, e.g. a null-pointer bug). It does **not** catch and was never intended to catch domain-validation rejections — those are `Error`s thrown by `domain/services/*.ts` methods (e.g. an illegal workflow transition, a role check failure), which every calling page already wraps in a local `try/catch` → `message.error()`/`Alert` pattern, established well before this pass. Confirmed by reading `AppErrorBoundary.tsx`'s `componentDidCatch` (React error-boundary semantics: it only fires for errors thrown during rendering/lifecycle/constructors of its child tree, never for errors thrown inside an event handler like `onClick`, which is exactly where every domain-service call in this app happens). (Source)

## 6. localStorage resilience — scenario table

| Scenario | Behavior | Method |
|---|---|---|
| No data (first-ever visit) | `ensureSchemaVersion()` finds no version marker and no prior `dermahealth:v1:*` keys → not treated as corruption, marker gets written, every store falls back to its seed array (pre-existing `loadFromStorage` returns `null` behavior) | Source |
| Valid, current-schema data | Loads normally; `hasReferentialIntegrityIssues()` passes since seeded/self-consistent data satisfies every FK check | Source |
| Old/incompatible schema (version marker present but `!== SCHEMA_VERSION`, or marker absent but `dermahealth:v1:*` keys exist) | All `dermahealth:v1:*` keys wiped, fresh seed loads, `wasDataAutoRecovered()` returns true | Source |
| Corrupted JSON (`localStorage.getItem` returns unparseable text) | `JSON.parse` throws inside `loadFromStorage`'s try/catch → that one key is removed and falls back to seed, `recovered` flag set | Source |
| Parses but wrong shape (`{}`, `[null]`, `["x"]`, object missing `id`) | `isValidEntityArray` rejects it → same recovery path as corrupted JSON | Source |
| Partially-missing collections (some keys present/valid, others absent) | Each key independently falls back to seed for just that collection (pre-existing per-key behavior) | Source |
| Referentially invalid IDs (e.g. a persisted task points at an encounter ID that doesn't exist in the persisted encounters) | Caught by the new `hasReferentialIntegrityIssues()` check in `repositories.ts`, which forces a full `resetAllRepositoriesToSeed()` even though every individual key parsed and shape-validated correctly | Source |
| Manual reset ("Đặt lại dữ liệu demo") | Now requires confirming an AntD `Modal.confirm` (danger OK button) before `resetToSeed()` runs; clears only `dermahealth:v1:*` + the session key, never any unrelated `localStorage` key; navigates via full reload to `/app/dashboard`-equivalent default state; shows the browser's own confirm dialog first, then the app reloads on a clean seed | Source |

None of these paths render a blank page — every one resolves to either the persisted data (if it passed both the shape and referential-integrity checks) or a full, valid, internally-consistent seed world. (Source — no runtime execution of these paths was performed; this is a code-level trace of the guard logic added and verified via `tsc`/`eslint`, not an observed browser recovery.)

## 7. What was explicitly NOT verified

- No screenshot, no rendered pixel, no click was ever performed — this sandbox has no browser automation tool.
- Highcharts 3D rendering, tooltip behavior, hidden-tab reflow, and React Flow's actual on-screen graph layout were **not** visually confirmed — only that the correct props/options are passed and the module registration runs once, client-side (Source only).
- dnd-kit's actual drag gesture, `DragOverlay` visual position, and keyboard-drag behavior were **not** exercised — only that the correct sensors/handlers are wired (Source only).
- The localStorage recovery scenarios in §6 were verified by reading the guard code, not by manually corrupting `localStorage` in a real browser and reloading.
- `MANUAL_VISUAL_QA.md` is a checklist for a human to run in an actual browser — it has not been executed as part of this pass (see that file's own header note).
