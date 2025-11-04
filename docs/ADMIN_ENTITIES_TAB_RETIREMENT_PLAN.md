# Plan: Retire “Entities” Tab (Clients + Team) and Migrate to Dashboard User Directory

## Goals
- Remove Entities tab and consolidate all Clients/Team management into the Dashboard tab’s unified user directory.
- Preserve full CRUD and workflows via unified forms/services while maintaining backward compatibility and redirects.
- Reduce duplication (types, APIs, forms, filters) and simplify navigation.

## Current State (from docs/ADMIN_USERS_DATA_AUDIT_REPORT.md + code)
- Entities tab exists with Clients/Team sub-tabs: `src/app/admin/users/components/tabs/EntitiesTab.tsx`
- Dashboard tab already hosts the unified user directory (UsersTable + AdvancedUserFilters): `ExecutiveDashboardTab.tsx`
- Unified types/hooks/services are in place: `types/entities.ts`, `useFilterUsers.ts`, `useUnifiedUserService.ts`, `useEntityForm.ts`
- Legacy routes redirect to Entities: `/admin/clients`, `/admin/team` → `/admin/users?tab=entities`
- APIs: `/api/admin/entities/clients`, `/api/admin/entities/team-members`; and generalized `/api/admin/users` search/filter in place
- Forms: `ClientFormModal.tsx`, `TeamMemberFormModal.tsx` (duplicated logic)

## Decision
- Retire Entities tab and move Clients/Team management into Dashboard tab via:
  - Role-scoped filters (CLIENT, TEAM_MEMBER, TEAM_LEAD, etc.) and saved views
  - A single “New” action that opens a unified User form (role-first flow)
- Keep legacy routes functional via updated redirects into Dashboard tab with role filters.

## Scope
- UI: Tabs/navigation, Dashboard enhancements, form consolidation, removal of Entities tab.
- API: Prefer `/api/admin/users` with role filters; keep legacy `/api/admin/entities/*` endpoints during deprecation window.
- Types/hooks/services: Continue using unified types and hooks.
- Tests: Update E2E/unit to new paths and behaviors.
- Docs: Update all references.

## Phased Rollout (with feature flag: `RETIRE_ENTITIES_TAB`)
1) Prepare (FF off)
2) Dual-run (FF on for staging) + redirects to Dashboard
3) Remove Entities (FF default on) post soak
4) Cleanup legacy APIs, tests, docs

## Detailed Tasks

### 1) Dashboard Tab Upgrades (unified user directory)
- Add role presets and saved views:
  - Quick chips: “All”, “Clients”, “Team”, “Admins”
  - Map chips to filters in `useFilterUsers.ts` (role/status/department)
- Add “New” split-button:
  - Primary: New User
  - Submenu: Client, Team Member, Team Lead, Admin → Preselect role in form
- Extend AdvancedUserFilters to include:
  - Role multi-select (CLIENT, TEAM_MEMBER, TEAM_LEAD, STAFF, ADMIN)
  - Client-tier and department filters (if present)
- Wire CRUD to `useUnifiedUserService.ts`; keep behavior consistent with Entities.
- Files:
  - `src/app/admin/users/components/tabs/ExecutiveDashboardTab.tsx`
  - `src/app/admin/users/components/AdvancedUserFilters.tsx`
  - `src/app/admin/users/components/UsersTable.tsx`
  - `src/app/admin/users/hooks/useFilterUsers.ts`

### 2) Unified Form Consolidation
- Create `UnifiedUserFormModal` (role-first) built on `useEntityForm.ts`:
  - Dynamically render fields based on role (client: tier/phone; team: department/specialties; admin: RBAC hints)
  - Server endpoints: POST/PATCH `/api/admin/users` + role-specific payload adapters
- Replace `ClientFormModal.tsx` and `TeamMemberFormModal.tsx` usage with `UnifiedUserFormModal`.
- Keep legacy modals exported for transition; mark deprecated in code comments (no TODO placeholders).
- Files:
  - `src/components/admin/shared/UnifiedUserFormModal.tsx` (new)
  - `src/components/admin/shared/ClientFormModal.tsx` (migrate calls → new)
  - `src/components/admin/shared/TeamMemberFormModal.tsx` (migrate calls → new)
  - `src/app/admin/users/components/*` (open modal hooks/handlers)

### 3) Remove Entities Tab from UI
- Remove Entities entry from tab navigation:
  - `src/app/admin/users/components/TabNavigation.tsx` (remove { id: 'entities', … })
- Remove EntitiesTab import/render:
  - `src/app/admin/users/EnterpriseUsersPage.tsx` (delete EntitiesTab block)
  - `src/app/admin/users/components/index.ts` (remove EntitiesTab export)
  - `src/app/admin/users/components/tabs/index.ts` (ensure clean)
- Delete Entities-specific UI fragments inside Dashboard once parity confirmed (e.g., `EntityRelationshipMap` entry points if only used there).
- Files impacted:
  - `TabNavigation.tsx`, `EnterpriseUsersPage.tsx`, `components/index.ts`

### 4) Routing & Redirects
- Update legacy redirects to Dashboard:
  - `/admin/clients` → `/admin/users?tab=dashboard&role=CLIENT`
  - `/admin/team` → `/admin/users?tab=dashboard&role=TEAM_MEMBER` (or role in {TEAM_MEMBER, TEAM_LEAD})
- Ensure URL param parsing in `EnterpriseUsersPage.tsx` applies role filters to Dashboard on load.
- Keep `/admin/permissions` → `/admin/users?tab=rbac` as is.
- Files:
  - `src/app/admin/users/EnterpriseUsersPage.tsx` (URL param → filters)
  - Any dedicated redirect pages/hooks already used in e2e (`admin-unified-redirects.spec.ts`)

### 5) API Strategy
- Preferred: `/api/admin/users?role=CLIENT|TEAM_MEMBER|TEAM_LEAD&…` for listing/filtering
- Keep `/api/admin/entities/clients` and `/api/admin/entities/team-members` for one release as thin proxies calling unified service; mark deprecated.
- Align create/update endpoints to `/api/admin/users` with role validations; maintain old endpoints as passthrough during deprecation window.
- Files:
  - `src/app/api/admin/users/…` (ensure filters include role/tier/department)
  - `src/app/api/admin/entities/clients(…)/route.ts` (proxy + deprecation header)
  - `src/app/api/admin/entities/team-members(…)/route.ts` (proxy + deprecation header)

### 6) Types/Schema Alignment
- Continue with unified types: `src/app/admin/users/types/entities.ts`
- Ensure `ClientItem` and `TeamMemberItem` extend base `UserItem` cleanly; remove stray interface copies.
- Confirm schema fields present for client/team properties used by form (`tier`, `phone`, `workingHours`, `bookingBuffer`, `autoAssign`, `certifications`, `experienceYears`).
- Files:
  - `prisma/schema.prisma` (validate presence)
  - `src/app/admin/users/types/entities.ts`

### 7) Settings and Admin Pages
- Keep User Management settings (clients/teams) intact; surfaces in Dashboard filters and form defaults.
- No change to `src/app/admin/settings/user-management/page.tsx` beyond copy updates (remove references to “Entities tab”).
- Files:
  - `src/app/admin/settings/user-management/page.tsx`
  - `src/app/admin/settings/user-management/types.ts`

### 8) Tests
- Update E2E:
  - Remove `e2e/tests/admin-entities-tab.spec.ts`
  - Update `e2e/tests/admin-unified-redirects.spec.ts` to assert redirects land in Dashboard + role filter chip active
  - Adjust “Add user from Entities tab” flow → “Add user from Dashboard”
- Update unit/integration tests referencing Entities:
  - Replace `tab=entities` with `tab=dashboard` + role filter assertions
- Files:
  - `e2e/tests/admin-unified-redirects.spec.ts`
  - `e2e/tests/admin-add-user-flow.spec.ts`
  - `e2e/tests/phase3-virtual-scrolling.spec.ts` (navigate Dashboard directly)
  - Tests that depend on `/admin/entities/...` APIs (point to `/admin/users`)

### 9) Cleanups (post-deprecation window)
- Remove `EntitiesTab.tsx` and any Entities-only helpers/components.
- Remove `/api/admin/entities/clients` and `/api/admin/entities/team-members` routes after telemetry window.
- Purge any menu validator allowances for `admin/clients`/`admin/team` if no longer needed.

## Backward Compatibility
- Redirect old routes to Dashboard with selected filters.
- Keep legacy APIs (entities) as pass-through for one release cycle; add `Deprecation` and `Link` headers.

## Risks & Mitigations
- Risk: Missed CRUD parity → Mitigation: parity checklist + smoke tests on Dashboard for CLIENT/TEAM flows.
- Risk: Test flake due to changed navigation → Mitigation: update selectors, stabilize waits, run CI twice on PR.
- Risk: External links to Entities → Mitigation: redirects + telemetry to monitor hit counts.

## Acceptance Criteria
- Entities tab removed from UI; no route exposing it.
- Dashboard supports full Clients/Team listing + CRUD via unified form.
- Legacy routes redirect to Dashboard with filters.
- All E2E/unit tests pass; no regression in RBAC tab.
- Deprecated APIs respond with deprecation headers; calls reduced over time.

## Work Breakdown (file-level checklist)
- Remove tab:
  - `src/app/admin/users/components/TabNavigation.tsx`
  - `src/app/admin/users/EnterpriseUsersPage.tsx`
  - `src/app/admin/users/components/index.ts`
- Dashboard upgrades:
  - `ExecutiveDashboardTab.tsx`, `AdvancedUserFilters.tsx`, `UsersTable.tsx`, `useFilterUsers.ts`
- Unified form:
  - + `UnifiedUserFormModal.tsx`
  - Migrate `ClientFormModal.tsx`, `TeamMemberFormModal.tsx` call sites
- API:
  - Ensure `/api/admin/users` supports role filters thoroughly
  - Add deprecation/proxy to `/api/admin/entities/clients*`, `/api/admin/entities/team-members*`
- Tests:
  - Remove `admin-entities-tab.spec.ts`
  - Update `admin-unified-redirects.spec.ts`, `admin-add-user-flow.spec.ts`, `phase3-virtual-scrolling.spec.ts`
- Docs:
  - Update consolidation docs to reflect Entities retirement; add migration notes

## Timeline (estimate)
- Day 1-2: Dashboard enhancements + role chips + unified form scaffolding
- Day 3: Replace modal usage; CRUD parity validation; proxy APIs
- Day 4: Remove Entities tab; redirects; tests update
- Day 5: QA, soak in staging with FF, telemetry checks

## Rollout
- Stage behind `RETIRE_ENTITIES_TAB` in staging for 2-3 days.
- Enable in production with redirects and deprecation headers.
- After 1-2 sprints, remove legacy APIs/tests.

---

## Single-Page Dashboard Redesign (Oracle Fusion–style “Work Area”)

### Objectives
- Convert Dashboard into a single-page work area focused on operations and user management productivity.
- Surface User Directory at the top; reduce clicks; consolidate Overview/Operations into one canvas.

### Information Architecture
- Primary: User Directory (virtualized grid/list) with sticky global filters and saved views.
- Secondary: Compact infolets (KPIs), Approvals/Workflows, Import/Export, Recent Activity.
- Utilities: Command Bar (Add, Import CSV, Bulk Update, Export, Refresh), Command Palette (⌘K), Saved Views (URL-addressable).

### Layout (desktop)
- Header: Title + Command Bar; right-aligned omnibox search (name/email/id/role) with suggestions.
- Infolets row: 3–4 compact tiles; collapsible; defaults to compact to keep directory above the fold.
- Left filter rail (collapsible): Role, Status, Created, Department, Tier; sticky on scroll; counts per facet.
- Main content (pinned first): User Directory with column chooser, list/card toggle, infinite pagination, selection.
- Details: Split pane/drawer opens on row select; tabs inside (Overview, Details, Activity, Settings) without leaving page.
- Optional right rail: Pending Approvals, In-Progress Workflows, Alerts; collapsible.

### Interactions (Oracle patterns)
- Create/Tasks menu: New User → Client/Team Member/Team Lead/Admin (role-first); contextual actions by selection count.
- Bulk action bar on selection: Assign Role, Change Status, Export, Delete; impact preview.
- Saved Views: “All, Clients, Team, Admins, My Team, Recently Added”; sharable via URL.
- Filter chips with one-click clear/apply; keyboard shortcuts; row kebab actions (RBAC-gated).

### Performance & Resilience
- Server-side paging + filters; 30s cache; request dedupe; optimistic updates; background refresh; skeleton loaders.

### Accessibility & i18n
- Landmarks for header/nav/main/aside; ARIA grid with row/col headers; live regions for actions; full keyboard Nav; RTL-safe.

### Mobile/Tablet
- Sticky search and primary actions; filters in bottom sheet; directory in card mode; drawer for details; gesture-friendly.

### Telemetry & Rollout
- Metrics: view adoption, search-to-action rate, bulk success/errors, save-view usage.
- A/B: compact vs expanded infolets; enable with feature flag `DASHBOARD_SINGLE_PAGE`.

### Migration Steps (incremental)
1. Move User Directory above infolets; introduce compact infolets.
2. Add left filter rail + saved views + omnibox search.
3. Add Command Bar + keyboard palette (⌘K).
4. Implement split-pane/drawer for details; retire child tabs.
5. Update tests/docs; monitor telemetry and iterate.

### Files Impact
- `src/app/admin/users/components/tabs/ExecutiveDashboardTab.tsx`
- `src/app/admin/users/EnterpriseUsersPage.tsx`
- `src/app/admin/users/components/UsersTable.tsx`
- `src/app/admin/users/components/AdvancedUserFilters.tsx`
- `src/app/admin/users/hooks/useFilterUsers.ts`
- `src/app/admin/users/components/*` (command bar, drawer, infolets)

### Acceptance Criteria (single-page redesign)
- User Directory is visible above the fold on desktop; <2 clicks to common actions.
- Filters are sticky; saved views persist via URL; virtualized grid remains smooth at 1k+ rows.
- Drawer interaction avoids page navigation; bulk bar appears contextually; all actions RBAC-gated.
