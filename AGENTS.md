# NeoStats Hackathon — Agent Instructions

## Mission
Build a working, explainable Collaborative Project Management Platform in the official 3-hour assessment window. Prioritize correct end-to-end workflows, server-side authorization, local persistence, concurrent-update protection, and reliable delivery.

## Source of truth
1. Official challenge brief and hackathon guidelines.
2. This repository's current code and tests.
3. `PROJECT_RULES.md` and `docs/IMPLEMENTATION_PLAN.md`.
If instructions conflict, follow the official challenge requirements and flag the conflict.

## Hard constraints
- Assessment duration is **3 hours**.
- Database must run **locally** on the laptop. Cloud database/BaaS (including Neon and Supabase) is prohibited.
- Deployment is not required; the app must run locally.
- Frontend and backend are separate processes.
- Push changes to Git regularly. The latest pushed commit is evaluated.
- AI coding tools are allowed, but the participant must understand and explain submitted code.
- Never commit credentials or secrets.
- Authentication is required.
- Authorization must be enforced on the server, not only by hiding UI controls.
- Stale task edits must not silently overwrite newer changes. Return HTTP 409 for version conflicts.
- Provide migrations, seed data, README setup instructions, sample credentials, and a short architecture note.

## Working style
- Inspect existing files and current state before editing.
- Make the smallest safe change that advances a required workflow.
- Do not overwrite working code or re-scaffold an existing project without a clear reason.
- Implement in vertical slices: UI → API → database → UI.
- After each slice, run relevant checks and report actual results.
- Do not claim a command, test, database connection, or feature works unless it was verified.
- Use the exact package manager already established by the repo; do not mix package managers.
- Avoid unnecessary dependencies and optional features until P0 requirements work.
- Keep code readable enough for the participant to explain.

## Security and data integrity
- Hash passwords with a suitable password-hashing library; never store plaintext passwords.
- Validate inputs on the server.
- Parameterize SQL or use safe ORM APIs; never concatenate user input into SQL.
- Check authentication and resource-level authorization on every protected endpoint.
- Do not trust user IDs, roles, project IDs, or permissions supplied by the client without checking them against the authenticated user and database.
- Use database constraints/transactions where appropriate.
- Deactivated users must not be able to authenticate or continue using protected sessions.
- Protect against stale task updates with an atomic conditional update on the expected version; increment version on success.
- Avoid leaking stack traces, password hashes, tokens, or secrets in API responses/logs.
- Configure CORS narrowly for the local frontend origin.
- Keep `.env` ignored and commit `.env.example` with placeholder values only.

## Required product roles
- Admin: manage users; create/delete projects; assign project managers; view all projects.
- Project Manager: manage assigned projects; add/remove team members; create/update/delete tasks; assign tasks; change task status.
- Team Member: view projects they belong to; view assigned tasks; update their tasks; add comments; change task status.
- Viewer: read-only access to projects and tasks.
The challenge also requires project-level membership role changes. Define and document the project-level role semantics without granting unintended global privileges. Where requirements are ambiguous, choose a conservative interpretation and record the assumption.

## Required CRUD
- Users: create, read, update, deactivate.
- Projects: create, read, update, archive; Admin also has delete permission.
- Team members: add, remove, change project-level role.
- Tasks: create, read, update, delete, assign, change status.
- Comments: create, read, delete.

## Concurrency contract
- Every editable task has a numeric `version`.
- Task reads return the version.
- Task updates must include the version the client edited.
- Update succeeds only if the stored version equals the supplied version; increment version atomically.
- A stale version returns `409 Conflict` with a stable error code such as `TASK_VERSION_CONFLICT` and enough safe information for the UI to reload current data.

## API conventions
- Use consistent JSON responses and meaningful HTTP status codes.
- Validate request bodies, params, and query params.
- Distinguish 401 unauthenticated, 403 forbidden, 404 missing/hidden resource, 409 conflict, and 400 validation errors.
- Paginate/filter lists where time permits and required by the chosen UX.
- Keep route handlers thin; put reusable business rules in services/middleware where that improves clarity.

## Git and delivery
- Commit a working baseline early, then commit after meaningful milestones.
- Push regularly and verify the latest commit is pushed.
- Include migrations and a deterministic seed script.
- Seed demo users for all four roles, plus projects, memberships, tasks, and comments.
- README must document prerequisites, environment variables, migration/seed commands, starting both processes, and sample login credentials.
- Add a short architecture note covering data model, authorization, and concurrent-update handling.
- Final verification must include app startup, login, primary workflow, direct API authorization checks, stale-update conflict check, persistence, and Git push.

## Agent response format
At the end of each task, report:
1. What changed (files).
2. Commands run and their actual results.
3. Acceptance criteria passed/failed/not run.
4. Known risks or blockers.
5. The single next recommended action.
