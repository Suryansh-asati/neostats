# Project Rules — NeoStats Collaborative Project Management Platform

## Official constraints
- 3-hour assessment.
- Local-only database; cloud databases and backend-as-a-service are prohibited.
- No deployment required.
- Separate frontend and backend processes.
- Latest Git commit is evaluated; push regularly.
- AI assistance is allowed, and the developer must be able to explain the implementation.

## Proposed stack (confirm before scaffolding)
- Frontend: Next.js App Router, TypeScript, Tailwind CSS.
- Backend: Express.js + TypeScript.
- Database: local PostgreSQL 14+ (15+ recommended), optionally via Docker.
- Data access: Prisma unless setup or existing repository makes a simpler permitted option safer.
- Validation: Zod or equivalent.
- Auth: server-validated session or JWT implementation; select one and use it consistently.
- API: REST under `/api`.
Do not change the chosen stack without stating the reason and checking impact.

## Domain model (initial, not final)
- `users`: name, unique email, password hash, global role, active state, timestamps.
- `projects`: name, description, manager, archive state, timestamps.
- `project_members`: project/user relationship, project-level role, uniqueness on project + user.
- `tasks`: project, title, description, assignee, status, priority if useful, version, timestamps.
- `comments`: task, author, body, timestamps.
Add constraints, indexes, and fields required by the final implementation. Avoid a separate roles table unless it improves the design under the time constraint.

## Required role behavior
- Admin: manage users; create/delete projects; assign project managers; view all projects.
- Project Manager: manage assigned projects; manage project membership; create/update/delete tasks; assign tasks; change status.
- Team Member: view member projects; view assigned tasks; update assigned tasks; comment; change status.
- Viewer: read-only access to projects and tasks.
- Enforce permissions in backend middleware/services for every protected operation.
- Project-level role semantics are underspecified by the challenge. Document the chosen values and ensure they cannot elevate a user's global role.
- Conservatively define comment deletion permissions and project deletion/data-integrity behavior.

## Required workflows
1. Sign in/out; current-user endpoint; inactive users rejected.
2. Admin creates/updates/deactivates users, creates/deletes projects, assigns managers, and views all projects.
3. Project Manager manages assigned projects, membership, tasks, assignments, and statuses.
4. Team Member views member projects/assigned tasks, updates permitted tasks/status, and comments.
5. Viewer reads projects/tasks but cannot mutate them.
6. Task version conflict returns 409 and is surfaced in UI.
7. Migrations and seed script recreate a demonstrable state from scratch.

## Concurrency
Use optimistic locking. A task update must conditionally match both task ID and expected version in a single database operation/transaction. Successful update increments the version. Zero matching rows should be resolved carefully as missing/inaccessible task versus version conflict; return 409 for a stale version when the task exists and is accessible.

## Security
- Hash passwords; never store plaintext.
- Validate all external input.
- Use parameterized queries/safe ORM APIs.
- Do not trust client-supplied role/owner/assignee for authorization.
- Keep credentials in `.env`, exclude from Git, provide `.env.example`.
- No secrets in source code, screenshots, logs, or README.
- CORS only for the local frontend origin.
- Avoid exposing stack traces and sensitive user fields.
- Ensure inactive users cannot authenticate and cannot continue protected use.

## UX
- Build a clean, practical dashboard with role-aware navigation.
- Prefer a task table/list first; Kanban drag-and-drop is optional.
- Provide loading, empty, success, and error states for important flows.
- Make forbidden actions unavailable in the UI but still enforce them on the server.
- Use clear conflict messaging and a reload/review action.
- Avoid decorative work until all mandatory flows function.

## API
- REST JSON API under `/api`.
- Use consistent response/error shapes.
- Suggested status codes: 200/201 success, 204 successful no-content delete, 400 validation, 401 unauthenticated, 403 forbidden, 404 missing or intentionally concealed, 409 conflict, 500 unexpected error.
- Suggested routes:
  - `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
  - `GET/POST /api/users`, `PATCH /api/users/:id`, `PATCH /api/users/:id/deactivate`
  - `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:id`, `PATCH /api/projects/:id/archive`
  - `GET/POST /api/projects/:id/members`, `PATCH/DELETE /api/projects/:id/members/:userId`
  - `GET/POST /api/projects/:id/tasks`, `GET/PATCH/DELETE /api/tasks/:id`, `PATCH /api/tasks/:id/status`
  - `GET/POST /api/tasks/:id/comments`, `DELETE /api/comments/:id`
These routes are proposals; align frontend and backend before implementation.

## Definition of done
- Frontend and backend both start using documented commands.
- Local PostgreSQL connection works.
- Migrations and seed script work from a clean database.
- Demo accounts for all roles can sign in.
- Primary project/task workflow persists across refresh/restart.
- Unauthorized direct API operations are rejected.
- Stale task update returns 409.
- No secrets are committed.
- README and architecture note are present.
- Latest commit is pushed, if repository access and assessment rules permit.
