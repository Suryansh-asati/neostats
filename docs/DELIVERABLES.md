# Required Deliverables and Acceptance Checklist

## Source code and repository
- [ ] Complete frontend and backend source.
- [ ] Organized, understandable folder structure.
- [ ] `.gitignore` excludes `.env`, dependencies, build output, local database dumps, and secrets.
- [ ] `.env.example` contains placeholders only.
- [ ] Meaningful Git commits pushed regularly.
- [ ] Final push verified; latest commit is the evaluation target.

## Database
- [ ] Local PostgreSQL only; no Neon, Supabase, Firebase, or other cloud database/BaaS.
- [ ] Reproducible migration(s).
- [ ] Seed script works from a clean database.
- [ ] Seeded users cover Admin, Project Manager, Team Member, Viewer.
- [ ] Seed projects, project memberships, tasks, and comments.
- [ ] Foreign keys, unique constraints, and relevant indexes.
- [ ] Data persists after page refresh and app restart.

## Authentication and authorization
- [ ] Login works and password hashes are stored.
- [ ] Current-user endpoint/session works.
- [ ] Logout/session invalidation works according to selected auth strategy.
- [ ] Inactive user cannot sign in or continue protected access.
- [ ] Admin can manage users and projects as specified.
- [ ] Project Manager is limited to assigned projects.
- [ ] Team Member access is scoped to membership and permitted tasks.
- [ ] Viewer can read projects/tasks but cannot mutate.
- [ ] Direct API attempts by unauthorized roles are rejected.
- [ ] User-supplied IDs/roles are not trusted for access decisions.

## Business functionality
- [ ] Users: create, read, update, deactivate.
- [ ] Projects: create, read, update, archive; Admin delete.
- [ ] Team members: add, remove, change project-level role.
- [ ] Tasks: create, read, update, delete, assign, change status.
- [ ] Comments: create, read, delete.
- [ ] Validation and clear error messages.
- [ ] Loading, empty and error UI for primary flows.

## Concurrent updates
- [ ] Task responses include a version.
- [ ] Task update sends expected version.
- [ ] Database update checks expected version atomically and increments it.
- [ ] Stale update returns HTTP 409 with stable error code.
- [ ] UI tells user the task changed and allows reload/review.
- [ ] Two-session conflict scenario has been manually or automatically tested.

## Documentation
- [ ] README includes prerequisites and versions.
- [ ] Environment variables documented without real secrets.
- [ ] Local database setup documented.
- [ ] Migration and seed commands documented.
- [ ] Commands to start frontend and backend documented.
- [ ] Sample login credentials for each role documented.
- [ ] Short architecture note covers data model, authorization, and concurrency.

## Final demonstration
- [ ] Fresh local startup works by following README.
- [ ] Login with seeded accounts works.
- [ ] Show project creation/assignment.
- [ ] Show task creation/assignment/status update.
- [ ] Show team member comment.
- [ ] Show Viewer read-only behavior.
- [ ] Show unauthorized API request rejected.
- [ ] Show stale task update returning 409.
- [ ] Show persistence after refresh/restart.
- [ ] Final Git push verified.
