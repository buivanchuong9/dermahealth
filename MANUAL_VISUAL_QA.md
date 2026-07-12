# Manual Visual QA Checklist

**This checklist has not been executed.** This sandbox has no headless-browser/Playwright tool, so nothing below has been run against an actual rendered page. It exists so a human (or a future session with browser access) can walk through the app in real Chrome and check the boxes — do not report any item here as "done" without actually opening the app and doing it.

How to run it: `npm run dev`, open `http://localhost:5173` in Chrome, switch roles via the Sidebar's role dropdown (top of the nav) to reach role-gated routes, and go through each row below.

Legend for the "Responsive check" column: **D** = 1366×768 desktop, **T** = ~768px tablet width, **M** = ~375px narrow mobile width (Chrome DevTools device toolbar).

## Shell

| Check | Steps | Expected | D | T | M |
|---|---|---|---|---|---|
| Sidebar collapse | Resize to tablet/mobile width | Sider should not overlap content illegibly; if it doesn't auto-collapse, note this as a finding rather than assuming it does | ☐ | ☐ | ☐ |
| TopHeader search box | Type in the search input | It currently has no handler — confirm it visibly does nothing (not that it's broken, just that it's decorative; flag if this reads as a bug to a real user) | ☐ | — | — |
| Notification bell | Click bell, open Popover | List of notifications renders, "Đọc hết"/"Thử lại" buttons are clickable and don't throw a console error | ☐ | — | — |
| Role switch | Change role in Sidebar dropdown | Nav items appear/disappear per role; page you're currently on may become a role-denied `Result` (for Doctor Review/Audit/Integrations) — confirm the "Về trang tổng quan" button on that Result works | ☐ | — | — |
| Reset demo data | Click "Đặt lại dữ liệu demo" | AntD confirm modal appears first; Cancel does nothing; OK reloads the app to seed state | ☐ | — | — |

## Dashboard, Journey, AI/Doctor Review

| Check | Steps | Expected | D | T | M |
|---|---|---|---|---|---|
| Dashboard 3D column chart | Load `/app/dashboard`, switch role to non-patient and back | 3D column chart renders with visible depth/perspective, not flat; tooltip shows on hover; no console warnings from Highcharts | ☐ | ☐ | ☐ |
| Dashboard chart on hidden tab | If dashboard has tabs, switch away and back to the chart's tab | Chart should not render squashed/zero-width after being hidden then shown (Highcharts' classic reflow bug) | ☐ | — | — |
| AI Analysis flow | Go through intake → analysis → result on `/app/ai-analysis` | Steps UI advances correctly; red-flag/insufficient-data paths show a `Result`, not a crash | ☐ | ☐ | ☐ |
| Doctor Review as non-doctor | Switch role to non-doctor, visit `/app/doctor-review` | `Result` "Không có quyền truy cập" shows with a working "Về trang tổng quan" button | ☐ | — | — |
| Doctor Review as doctor, no open encounter | Switch to a doctor with no open encounter (if such a seed user exists) | `Empty` state shows instead of blank/plain text | ☐ | — | — |

## Workflow (BPM)

| Check | Steps | Expected | D | T | M |
|---|---|---|---|---|---|
| Template list → editor | Click a template row on `/app/workflows/templates` | Navigates to `/app/workflows/templates/WFT-DERM`; React Flow graph renders with visible nodes/edges, `Controls` usable | ☐ | ☐ | — |
| Invalid template ID | Manually navigate to `/app/workflows/templates/does-not-exist` | AntD `Result` shows the literal bad ID in the message, button returns to the template list — not a blank page, not a crash | ☐ | — | — |
| Step drag reorder | On a draft template, drag a step row to a new position (as `clinical_process_designer`/`medical_administrator`) | Row reorders; order change persists after reload; keyboard reorder (Tab to grip handle, Space to pick up, arrow keys, Space to drop) also works | ☐ | — | — |
| Step reorder as read-only role | Same page as any other role | No grip handle visible; `Alert` explains it's read-only | ☐ | — | — |
| Instance graph, invalid ID | Navigate to `/app/workflows/instances/does-not-exist` | Same `Result` pattern as templates, button returns to Work Queue | ☐ | — | — |
| Instance graph, minimap/controls at laptop width | Open a real instance at 1366×768 | React Flow `MiniMap` and `Controls` are visible and don't overlap the task inspector card | ☐ | — | — |

## Work Queue (dnd-kit)

| Check | Steps | Expected | D | T | M |
|---|---|---|---|---|---|
| Drag task between columns (mouse) | Drag a "Sẵn sàng" task into "Đang thực hiện" | Task moves, Vietnamese success toast appears, the same task also updates in the "Tất cả tác vụ khác" table below if applicable | ☐ | — | — |
| Drag task (keyboard) | Tab to a task's grip handle, Space to pick up, arrow keys to move columns, Space to drop | Same result as mouse drag; screen reader (or DevTools accessibility tree) reads the `aria-label` naming the specific task | ☐ | — | — |
| Illegal drop | Drag a completed task back to "Sẵn sàng" | Vietnamese error toast, task snaps back, no state change | ☐ | — | — |
| Drag cancel (Escape) | Start a drag, press Escape | Drag cancels cleanly, task returns to origin column, no leftover overlay | ☐ | — | — |
| DragOverlay visual | During a drag | A floating card follows the cursor, distinct from the ghost left in the source column | ☐ | — | — |

## Records / EMR

| Check | Steps | Expected | D | T | M |
|---|---|---|---|---|---|
| Treatment-plan Kanban drag | Drag a card between the 3 columns | Card moves, success toast appears (note: this view is local mock state — reload will reset it, which is expected per `FINAL_VERIFICATION.md`) | ☐ | — | — |
| Break-glass gate | Switch to a role outside patient/doctor/medical_administrator, open `/app/records` | Gate card shows with a required-reason textarea; "Xác nhận" is disabled/no-ops until reason is filled; "Về trang tổng quan" button also present | ☐ | — | — |
| Sign a record | As doctor, sign a completed record | Button disables once signed; addendum box appears instead | ☐ | — | — |

## CRM / Reports / Progress

| Check | Steps | Expected | D | T | M |
|---|---|---|---|---|---|
| Progress 3D chart | Open `/app/progress` | 3D column chart renders with depth; photo-comparison placeholders show flat neutral gray boxes (not the old pastel gradient) | ☐ | ☐ | — |
| Reports 3D donut | Open `/app/reports`, "Tổng quan" tab | 3D donut/pie renders with visible depth, legend readable, tooltip on hover shows percentage | ☐ | ☐ | — |
| Care alert close | As medical_administrator/care_coordinator, close an alert | Vietnamese confirmation/toast, alert moves out of the open list | ☐ | — | — |

## Audit / Integrations

| Check | Steps | Expected | D | T | M |
|---|---|---|---|---|---|
| Access denied | As a role without audit access, visit `/app/audit` and `/app/integrations` | Both show `Result` with a working "Về trang tổng quan" button | ☐ | — | — |
| Audit table scroll | As admin, open `/app/audit` at narrow width | Table scrolls horizontally inside its own container, page itself does not scroll sideways | — | ☐ | ☐ |

## Cross-cutting

| Check | Steps | Expected | D | T | M |
|---|---|---|---|---|---|
| Route-level loading skeleton | Hard-refresh on any in-app route with network throttled (DevTools → Slow 3G) | AntD `Skeleton` shows briefly inside the content area (sidebar/header stay put), not a blank white flash | ☐ | — | — |
| Forced render error | Temporarily throw inside a component (dev-only test) to trigger `AppErrorBoundary` | Vietnamese `Result` with Retry/Về trang tổng quan; in dev mode a stack trace appears in a collapsed `<pre>`; in a production build it must not | ☐ | — | — |
| localStorage corruption recovery | DevTools → Application → Local Storage → manually edit a `dermahealth:v1:*` value to invalid JSON, reload | App recovers to seed data, one-time "Đã khôi phục dữ liệu mẫu" notification appears bottom-right, no blank page | ☐ | — | — |
| Modal/Drawer placement at narrow width | Open any AntD `Modal` (e.g. reset confirm, add-task modal) at mobile width | Modal is centered and doesn't overflow the viewport horizontally | — | ☐ | ☐ |
