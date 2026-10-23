# NeoStats Hackathon — Execution Plan

## Mission and time box
Official duration: **3 hours**. Plan to the strict limit. Do not assume an extension. Deployment is not required.

## Phase 0 — Confirm constraints and repo state (0–10 min)
- Check repository status and inspect existing files before scaffolding.
- Verify Node.js 22+, npm, Git, PostgreSQL client/server or Docker.
- Confirm Git remote and push access.
- Start a blank app only if no existing suitable project is present.
**Exit criteria:** know the repo state; one permitted local database path is viable.

## Phase 1 — Scaffold and database (10–30 min)
- Create frontend and backend using agreed stack.
- Create `.gitignore`, `.env.example`, and local `.env` (never commit `.env`).
- Start local PostgreSQL; verify connection.
- Define schema and create first migration.
- Implement deterministic seed script with Admin, Project Manager, Team Member, Viewer, projects, memberships, tasks, comments.
- Commit and push a runnable baseline.
**Exit criteria:** both processes can start; database migration and seed succeed.

## Phase 2 — Backend vertical slice (30–65 min)
- Implement login/current-user/logout.
- Implement centralized authentication and resource authorization.
- Implement project listing/details and task list/create/update/status.
- Ensure all reads are scoped to accessible resources.
- Add task optimistic locking with atomic version check and 409 conflict.
- Validate all external inputs and use safe DB access.
**Exit criteria:** API calls prove login, project/task persistence, permission rejection, and stale-version conflict.

## Phase 3 — Frontend core workflows (65–110 min)
- Build shared shell and login page.
- Build role-aware dashboard/project list.
- Build project detail and task list/detail.
- Support task creation/editing/assignment/status for authorized roles.
- Show loading, empty, error, and conflict states.
- Connect frontend to backend; confirm CORS/auth behavior.
**Exit criteria:** user can complete the primary project/task flow in browser with persisted data.

## Phase 4 — Remaining required workflows (110–145 min)
- User create/read/update/deactivate.
- Project create/read/update/archive and Admin delete.
- Membership add/remove/project-role change.
- Comments create/read/delete.
- Enforce and test role restrictions.
- Do not spend time on optional UI polish while mandatory CRUD is missing.
**Exit criteria:** all required operation categories are implemented; record any uncompleted edge cases honestly.

## Phase 5 — Verify and deliver (145–180 min)
- Test each role using separate browser sessions or seeded credentials.
- Test direct API authorization, not only hidden buttons.
- Test two edits to the same task: second stale update returns 409.
- Restart app and verify persistence.
- Run available build/lint/tests and fix blockers.
- Verify `.env` is not tracked; inspect `git status`.
- Update README, sample credentials, migration/seed/start commands, architecture note.
- Commit and push final changes; confirm push succeeded.
**Exit criteria:** latest commit is pushed and a clean local startup/demo path is documented.

## Priority order
### P0 — must work
- App starts locally.
- Authentication.
- Server-side authorization.
- Project/task read and core CRUD.
- Local database persistence.
- Task assignment/status.
- Stale update detection with HTTP 409.
- Required repository and README delivery.

### P1 — required business operations
- User CRUD/deactivation.
- Project lifecycle/archive/delete.
- Membership and project-level role changes.
- Comments CRUD.
- Seed data for all roles.
- Migration reproducibility.

### P2 — polish
- Rich Kanban drag/drop, animation, complex charts, elaborate pagination, advanced filters.
- Only do these if P0/P1 are safe and time remains.

## Parallel work and chat split
Use separate chats only after the shared contracts are written and provided to each chat. If working in one repository with coding agents, avoid simultaneous edits to the same files.

1. **Command center:** requirements, architecture, contracts, status and final decisions.
2. **Backend/database/security:** schema, migrations, seed, auth, API, permissions, concurrency.
3. **Frontend:** pages, forms, layout, API integration against agreed contract.
4. **Integration/testing:** API tests, role tests, stale update test, debugging.
5. **Delivery:** README, architecture note, Git and demo checklist.

Backend contract/schema must be shared before frontend integration. Use repository code and this plan as the source of truth.

## Milestone checkpoints
- M1 (30 min): database, migration, seed, both processes start.
- M2 (65 min): login + protected project/task API + concurrency contract.
- M3 (110 min): core UI workflow works end-to-end.
- M4 (145 min): required CRUD/role workflows substantially complete.
- M5 (180 min): verification, documentation, final push.

If behind schedule:
1. Stop optional polish.
2. Stop adding libraries.
3. Finish one vertical slice end-to-end.
4. Fix server authorization and concurrency.
5. Ensure migrations, seed, README and Git push.
Do not fake test results or claim incomplete features are complete.

## End-of-task report format
- Completed:
- Changed files:
- Commands/tests and actual results:
- Acceptance criteria: passed / failed / not run
- Blockers/risks:
- Next action:
