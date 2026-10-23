# Feature audit (2026-10-23)

Status is based on the checked-in implementation and available prior verification evidence. “Verified” means a runtime/build result was observed, not merely that a route exists.

| Requirement | Status | Notes |
|---|---|---|
| Local PostgreSQL / Prisma schema and migration | Implemented and verified | Local PostgreSQL 18, initial migration, and seeded data were exercised earlier. |
| Authentication, current user, logout, inactive account guard | Implemented but unverified | JWT cookie; active status is reloaded on each protected request. Logout clears browser cookie but has no server-side token revocation. |
| Admin user list/create/update/deactivate | Implemented but unverified | Admin-only API. UI currently creates and deactivates; user editing is API-only. |
| Project create/read/update/archive/delete | Implemented but unverified | Admin creates/deletes; assigned manager can update/archive. Project deletion cascades to tasks/members/comments. |
| Project membership add/remove/role change | Implemented but unverified | Assigned manager/Admin endpoints and UI controls; project roles do not elevate global permissions. |
| Task create/read/update/status/delete/assign | Implemented but unverified | Version check is atomic. UI status changes, task create/delete are present; assignment editing is incomplete. |
| Comments list/create/delete | Implemented but unverified | Reads and creation are integrated in UI; deletion API exists, UI delete action is missing. |
| Role and project-boundary authorization | Implemented but partly verified | Prior checks covered Viewer 403, PM admin-route denial, manager reassignment denial, and missing-project 404. Full route matrix is absent. |
| Team member editing only assigned tasks | Implemented but unverified | API checks assignee ownership. Earlier 403 test selected an unassigned task; later assigned-task update and stale conflict were verified. |
| Frontend dashboard and forms | Implemented but unverified | Single page, not dedicated Dashboard/Projects/Tasks/Team/Admin sections. Search/filter/sort and richer loading/empty states are missing. |
| Priority, due dates, labels, subtasks, Kanban, activity, notifications, summaries | Missing | Schema has no corresponding models/fields. |
| Automated API/frontend tests | Missing | No test/spec files or test scripts found. |
| Builds and pushed baseline | Implemented and verified | Commit `54086ee` was present locally and at `origin/master`; later production builds passed. |

## Ranked implementation sequence

1. Add repeatable API tests for four roles, project boundaries, inactive users, and optimistic concurrency.
2. Complete core UI actions already backed by APIs (user edit, task assignment, comment deletion) and improve task search/filter.
3. Harden session logout/revocation and normalize API error handling/validation.
4. Add high-value schema-backed task fields (priority and due date) with a non-destructive migration and UI.
5. Consider labels, subtasks, activity, notifications, and Kanban after the core remains green.
