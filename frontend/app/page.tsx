"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Role = "ADMIN" | "PROJECT_MANAGER" | "TEAM_MEMBER" | "VIEWER";
type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
};
type Comment = {
  id: string;
  body: string;
  author: { id: string; name: string };
};
type Task = {
  id: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  version: number;
  assigneeId?: string | null;
  assignee?: { id: string; name: string } | null;
  comments?: Comment[];
};
type Membership = {
  userId: string;
  role: "MANAGER" | "MEMBER" | "VIEWER";
  user: { id: string; name: string; email: string; role: Role };
};
type Project = {
  id: string;
  name: string;
  description: string;
  archived?: boolean;
  manager: { id: string; name: string };
  memberships?: Membership[];
  tasks: Task[];
};
type View = "Overview" | "Projects" | "Tasks" | "Team" | "Admin";

class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function messageFor(error: unknown) {
  if (!(error instanceof ApiError)) return "Could not reach NeoStats. Check that the API is running and try again.";
  if (error.code === "REQUEST_TIMEOUT") return "The API did not respond within 12 seconds. Check that the backend is running, then try again.";
  if (error.code === "NETWORK_ERROR") return "Could not reach the API. Check that the backend is running and try again.";
  const messages: Record<string, string> = {
    INVALID_CREDENTIALS: "Email or password is incorrect.",
    UNAUTHENTICATED: "Your session has expired. Please sign in again.",
    FORBIDDEN: "You do not have permission to do that.",
    NOT_FOUND: "That item is no longer available.",
    VALIDATION_ERROR: "Check the form fields and try again.",
    INVALID_MANAGER: "Choose an active Project Manager account.",
    ASSIGNEE_NOT_IN_PROJECT: "Choose an active team member who belongs to this project.",
    MEMBERSHIP_EXISTS: "This person is already on the project.",
    EMAIL_EXISTS: "An account with that email already exists.",
    TASK_VERSION_CONFLICT: "This task changed elsewhere. The latest version has been loaded.",
    CANNOT_DEACTIVATE_SELF: "You cannot deactivate your own account.",
  };
  return messages[error.code] || `Request failed (${error.status}): ${error.code}`;
}

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${API}${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(response.status, data.error || `HTTP_${response.status}`);
    }
    return (response.status === 204 ? null : await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) throw new ApiError(0, "REQUEST_TIMEOUT");
    throw new ApiError(0, "NETWORK_ERROR");
  } finally {
    window.clearTimeout(timeout);
  }
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function StatusPill({ status }: { status: Task["status"] }) {
  const label = status === "TODO" ? "To do" : status === "IN_PROGRESS" ? "In progress" : "Done";
  return <span className={`status-pill status-${status.toLowerCase()}`}><i />{label}</span>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><span className="empty-icon">◇</span><h3>{title}</h3><p>{text}</p></div>;
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="section-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function TaskCard({
  task,
  project,
  user,
  canManageProject,
  busy,
  onUpdate,
  onStatus,
  onDelete,
  onComment,
  onDeleteComment,
}: {
  task: Task;
  project: Project;
  user: User;
  canManageProject: boolean;
  busy: boolean;
  onUpdate: (task: Task, data: { title: string; description: string; assigneeId: string | null }) => void;
  onStatus: (task: Task, status: Task["status"]) => void;
  onDelete: (task: Task) => void;
  onComment: (task: Task, body: string) => Promise<boolean>;
  onDeleteComment: (comment: Comment) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [commentText, setCommentText] = useState("");
  const canManage = canManageProject;
  const canUpdate = canManage || task.assignee?.id === user.id;
  const canComment = user.role !== "VIEWER";
  const members = (project.memberships || []).filter((membership) => membership.user.role === "TEAM_MEMBER");

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await onComment(task, commentText);
    if (saved) { setCommentText(""); setCommenting(false); }
  }

  return (
    <article className="task-card">
      <div className="task-topline"><div className="task-title-wrap"><span className="task-mark">✓</span><div><h3>{task.title}</h3><p className="task-project-name">{project.name}</p></div></div><StatusPill status={task.status} /></div>
      {task.description && <p className="task-description">{task.description}</p>}
      <div className="task-meta"><span className="avatar avatar-small">{initials(task.assignee?.name || "Unassigned")}</span><span>{task.assignee?.name || "Unassigned"}</span><span className="meta-divider" /> <span>Version {task.version}</span></div>

      <div className="task-actions">
        {canUpdate && <label className="compact-field">Status<select aria-label={`Status for ${task.title}`} disabled={busy} value={task.status} onChange={(event) => onStatus(task, event.target.value as Task["status"])}><option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="DONE">Done</option></select></label>}
        {canManage && <button className="button button-quiet button-small" type="button" onClick={() => setEditing((value) => !value)}>{editing ? "Close editor" : "Edit task"}</button>}
        {canManage && <button className="button button-danger-quiet button-small" type="button" disabled={busy} onClick={() => onDelete(task)}>Delete</button>}
      </div>

      {editing && canManage && <form className="inline-editor" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onUpdate(task, { title: String(form.get("title")), description: String(form.get("description")), assigneeId: String(form.get("assigneeId") || "") || null }); setEditing(false); }}>
        <label>Task name<input name="title" defaultValue={task.title} maxLength={200} required /></label>
        <label>Description<input name="description" defaultValue={task.description} maxLength={2000} /></label>
        <label>Assignee<select name="assigneeId" defaultValue={task.assignee?.id || ""}><option value="">Unassigned</option>{members.map((member) => <option key={member.userId} value={member.userId}>{member.user.name}</option>)}</select></label>
        <button className="button button-primary button-small" disabled={busy}>Save task</button>
      </form>}

      <div className="comments-block">
        <div className="comments-heading"><span>Comments <b>{task.comments?.length || 0}</b></span>{canComment && <button className="text-button" type="button" onClick={() => setCommenting((value) => !value)}>{commenting ? "Cancel" : "+ Add comment"}</button>}</div>
        {(task.comments || []).length > 0 ? <div className="comment-list">{task.comments?.map((comment) => <div className="comment-item" key={comment.id}><span className="avatar avatar-tiny">{initials(comment.author.name)}</span><div className="comment-copy"><div><strong>{comment.author.name}</strong><span className="comment-time">Project update</span></div><p>{comment.body}</p></div>{(comment.author.id === user.id || canManage) && <button className="icon-button" type="button" aria-label={`Delete comment by ${comment.author.name}`} title="Delete comment" onClick={() => onDeleteComment(comment)}>×</button>}</div>)}</div> : <p className="no-comments">No comments yet.</p>}
        {commenting && canComment && <form className="comment-form" onSubmit={submitComment}><label className="sr-only" htmlFor={`comment-${task.id}`}>Add a comment</label><input id={`comment-${task.id}`} value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Share an update…" maxLength={2000} required /><button className="button button-primary button-small" disabled={busy}>Post</button></form>}
        {!canComment && <p className="read-only-note">View only</p>}
      </div>
    </article>
  );
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [view, setView] = useState<View>("Overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isAdmin = user?.role === "ADMIN";
  const canManageProject = (project: Project) => isAdmin || project.manager.id === user?.id;
  const visibleProjects = useMemo(() => projects.filter((project) => {
    const text = `${project.name} ${project.description} ${project.tasks.map((task) => task.title).join(" ")}`.toLowerCase();
    return text.includes(query.toLowerCase());
  }), [projects, query]);
  const tasks = useMemo(() => visibleProjects.flatMap((project) => project.tasks.map((task) => ({ ...task, project })))
    .filter(({ status }) => statusFilter === "ALL" || status === statusFilter), [visibleProjects, statusFilter]);
  const totalTasks = projects.reduce((total, project) => total + project.tasks.length, 0);
  const openTasks = projects.reduce((total, project) => total + project.tasks.filter((task) => task.status !== "DONE").length, 0);
  const completedTasks = totalTasks - openTasks;

  async function loadData(activeUser: User) {
    const data = await request<Project[]>("/api/projects");
    setProjects(data);
    if (activeUser.role === "ADMIN") setUsers(await request<User[]>("/api/users"));
    else setUsers([]);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const current = await request<User>("/api/auth/me");
        if (!mounted) return;
        setUser(current);
        setLoading(true);
        await loadData(current);
      } catch (reason) {
        if (reason instanceof ApiError && reason.status !== 401 && mounted) setError(messageFor(reason));
      } finally {
        if (mounted) { setLoading(false); setBooting(false); }
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function refresh() {
    if (user) await loadData(user);
  }

  async function mutate(label: string, action: () => Promise<unknown>) {
    setBusy(true); setError(""); setNotice("");
    try {
      await action();
      if (user) await loadData(user);
      setNotice(label);
      return true;
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409 && reason.code === "TASK_VERSION_CONFLICT") await refresh().catch(() => undefined);
      setError(messageFor(reason));
      return false;
    } finally { setBusy(false); }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const signedIn = await request<User>("/api/auth/login", "POST", { email, password });
      setUser(signedIn); await loadData(signedIn); setPassword(""); setNotice(`Welcome back, ${signedIn.name}.`);
    } catch (reason) { setError(messageFor(reason)); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true); setError("");
    try { await request<null>("/api/auth/logout", "POST"); setUser(null); setProjects([]); setUsers([]); setView("Overview"); setNotice(""); }
    catch (reason) { setError(messageFor(reason)); }
    finally { setBusy(false); }
  }

  function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    void mutate("Project created.", () => request("/api/projects", "POST", { name: form.get("name"), description: form.get("description"), managerId: form.get("managerId") || undefined })).then((saved) => { if (saved) formElement.reset(); });
  }

  function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    void mutate("User account created.", () => request("/api/users", "POST", { name: form.get("name"), email: form.get("email"), password: form.get("password"), role: form.get("role") })).then((saved) => { if (saved) formElement.reset(); });
  }

  function createTask(project: Project, event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    void mutate("Task added to project.", () => request(`/api/projects/${project.id}/tasks`, "POST", { title: form.get("title"), description: form.get("description"), assigneeId: form.get("assigneeId") || undefined })).then((saved) => { if (saved) formElement.reset(); });
  }

  if (booting) return <main className="boot-screen"><div className="brand-mark">N</div><p>Loading your workspace…</p></main>;

  if (!user) return <main className="login-screen"><section className="login-brand-panel"><div className="brand-lockup"><span className="brand-mark">N</span><span>NeoStats</span></div><div className="login-pitch"><span className="eyebrow light-eyebrow">WORK, IN SYNC</span><h1>Make meaningful progress together.</h1><p>One clear place to organize projects, align your team, and keep every task moving.</p><div className="login-decoration"><div className="decoration-line" /><div className="decoration-line short" /><div className="decoration-card"><span className="decoration-check">✓</span><span><b>Launch checklist</b><small>Progress is looking good</small></span><span className="decoration-status">On track</span></div></div></div><span className="panel-footnote">A calmer way to move work forward.</span></section>
    <section className="login-form-panel"><div className="login-form-wrap"><div className="eyebrow">WELCOME BACK</div><h2>Sign in to your workspace</h2><p className="form-intro">Use your NeoStats account to continue.</p>{error && <div className="alert alert-error" role="alert"><span>!</span>{error}</div>}
      <form onSubmit={login} className="stack-form"><label>Email address<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required /></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /></label><button className="button button-primary button-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}<span>→</span></button></form><div className="login-help">Demo accounts are documented in the project README.</div></div></section></main>;

  return <main className="app-shell">
    <aside className="sidebar"><div className="brand-lockup"><span className="brand-mark">N</span><span>NeoStats</span></div><div className="workspace-switch"><span className="workspace-icon">N</span><span><small>WORKSPACE</small><b>NeoStats team</b></span><span className="chevron">⌄</span></div><nav className="side-nav" aria-label="Main navigation"><span className="nav-label">WORKSPACE</span>{(["Overview", "Projects", "Tasks", "Team"] as View[]).map((item) => <button key={item} className={`nav-item ${view === item ? "active" : ""}`} onClick={() => setView(item)}><span className="nav-icon">{{ Overview: "▦", Projects: "▤", Tasks: "✓", Team: "♧", Admin: "⚙" }[item]}</span>{item}{item === "Tasks" && <span className="nav-count">{totalTasks}</span>}</button>)}{isAdmin && <><span className="nav-label nav-label-spaced">MANAGE</span><button className={`nav-item ${view === "Admin" ? "active" : ""}`} onClick={() => setView("Admin")}><span className="nav-icon">⚙</span>Administration</button></>}</nav><div className="sidebar-bottom"><div className="help-card"><span className="help-icon">?</span><b>Need a hand?</b><p>Check the project README for setup and demo account details.</p></div><div className="sidebar-user"><span className="avatar">{initials(user.name)}</span><span className="sidebar-user-copy"><b>{user.name}</b><small>{user.role.replaceAll("_", " ")}</small></span></div></div></aside>

    <section className="main-panel"><header className="topbar"><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{view}</strong></div><div className="topbar-actions"><label className="search-box"><span>⌕</span><input aria-label="Search projects and tasks" placeholder="Search projects and tasks…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><span className="topbar-divider" /><div className="profile-chip"><span className="avatar avatar-small">{initials(user.name)}</span><span>{user.name}</span><button className="text-button" type="button" onClick={logout} disabled={busy}>Sign out</button></div></div></header>

    <div className="page-content">{error && <div className="alert alert-error global-alert" role="alert"><span>!</span>{error}<button className="alert-close" onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}{notice && <div className="alert alert-success global-alert" role="status"><span>✓</span>{notice}<button className="alert-close" onClick={() => setNotice("")} aria-label="Dismiss message">×</button></div>}
      {loading && <div className="loading-strip"><span className="spinner" /> Syncing workspace…</div>}

      {view === "Overview" && <>
        <SectionHeading eyebrow="YOUR WORKSPACE" title={`Good to see you, ${user.name.split(" ")[0]}`} description="Here’s the latest across your projects." action={isAdmin ? <button className="button button-primary" onClick={() => setView("Projects")}>＋ New project</button> : undefined} />
        <div className="summary-grid"><div className="summary-card"><span className="summary-icon icon-violet">▤</span><span className="summary-label">Projects</span><b>{projects.length}</b><small>Available to you</small></div><div className="summary-card"><span className="summary-icon icon-blue">◷</span><span className="summary-label">Open tasks</span><b>{openTasks}</b><small>Work in progress</small></div><div className="summary-card"><span className="summary-icon icon-green">✓</span><span className="summary-label">Completed</span><b>{completedTasks}</b><small>Across visible projects</small></div><div className="summary-card"><span className="summary-icon icon-amber">♧</span><span className="summary-label">Team members</span><b>{new Set(projects.flatMap((project) => (project.memberships || []).map((membership) => membership.userId))).size}</b><small>In your projects</small></div></div>
        <div className="overview-grid"><section className="surface-card overview-projects"><div className="card-heading"><div><h2>Projects</h2><p>Your active workspaces</p></div><button className="text-button" onClick={() => setView("Projects")}>View all →</button></div>{projects.filter((project) => !project.archived).slice(0, 4).map((project) => <button className="project-list-row" key={project.id} onClick={() => setView("Projects")}><span className="project-avatar">{initials(project.name)}</span><span className="project-list-copy"><b>{project.name}</b><small>{project.manager.name} · {project.tasks.length} tasks</small></span><span className="progress-track"><i style={{ width: `${project.tasks.length ? Math.round(project.tasks.filter((task) => task.status === "DONE").length / project.tasks.length * 100) : 0}%` }} /></span><span className="progress-value">{project.tasks.length ? Math.round(project.tasks.filter((task) => task.status === "DONE").length / project.tasks.length * 100) : 0}%</span><span className="row-arrow">›</span></button>)}{projects.filter((project) => !project.archived).length === 0 && <EmptyState title="Your workspace is ready" text="Projects you can access will appear here." />}</section>
          <section className="surface-card overview-tasks"><div className="card-heading"><div><h2>Recent tasks</h2><p>Keep an eye on what’s moving</p></div><button className="text-button" onClick={() => setView("Tasks")}>All tasks →</button></div>{projects.flatMap((project) => project.tasks.map((task) => ({ task, project }))).slice(0, 4).map(({ task, project }) => <button className="recent-task-row" key={task.id} onClick={() => setView("Tasks")}><span className={`task-dot dot-${task.status.toLowerCase()}`} /><span className="recent-task-copy"><b>{task.title}</b><small>{project.name}</small></span><StatusPill status={task.status} /></button>)}{totalTasks === 0 && <EmptyState title="No tasks to show" text="Tasks from your projects will appear here." />}</section></div>
      </>}

      {view === "Projects" && <><SectionHeading eyebrow="ORGANIZE YOUR WORK" title="Projects" description="Plan work, share context, and see progress across your team." action={isAdmin ? <button className="button button-primary" onClick={() => document.getElementById("create-project")?.scrollIntoView({ behavior: "smooth", block: "center" })}>＋ New project</button> : undefined} />
        {isAdmin && <form id="create-project" className="surface-card create-project-form" onSubmit={createProject}><div className="form-card-title"><div><h2>Create a project</h2><p>Start a new shared workspace.</p></div><span className="create-project-icon">＋</span></div><div className="form-grid"><label>Project name<input name="name" maxLength={100} placeholder="e.g. Website relaunch" required /></label><label>Project Manager<select name="managerId" required defaultValue=""><option value="" disabled>Select a manager</option>{users.filter((account) => account.active && account.role === "PROJECT_MANAGER").map((account) => <option key={account.id} value={account.id}>{account.name} · {account.email}</option>)}</select></label><label className="field-wide">Description<input name="description" maxLength={1000} placeholder="What is this project about?" /></label></div><button className="button button-primary" disabled={busy}>{busy ? "Creating…" : "Create project"}</button></form>}
        <div className="list-toolbar"><div><b>{visibleProjects.length}</b> projects <span>·</span> Search filters projects and tasks</div><select aria-label="Project visibility filter" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="ALL">All work</option><option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="DONE">Done</option></select></div>
        {visibleProjects.length === 0 ? <EmptyState title="No matching projects" text={projects.length ? "Try a different search." : "Projects you can access will appear here."} /> : <div className="project-grid">{visibleProjects.map((project, index) => {
          const completed = project.tasks.filter((task) => task.status === "DONE").length;
          const progress = project.tasks.length ? Math.round(completed / project.tasks.length * 100) : 0;
          const taskMatches = project.tasks.filter((task) => statusFilter === "ALL" || task.status === statusFilter);
          return <article className="project-card" key={project.id}><div className={`project-card-accent accent-${index % 4}`} /><div className="project-card-main"><div className="project-card-heading"><div className={`project-avatar project-avatar-large avatar-tone-${index % 4}`}>{initials(project.name)}</div><div className="project-card-title"><div className="project-title-line"><h2>{project.name}</h2>{project.archived && <span className="archived-pill">Archived</span>}</div><p>{project.description || "No project description yet."}</p></div><button className="icon-button more-button" aria-label={`Project actions for ${project.name}`} title="Project actions" onClick={(event) => { const menu = event.currentTarget.nextElementSibling as HTMLDetailsElement | null; menu?.toggleAttribute("open"); }}>···</button><details className="project-menu"><summary className="sr-only">Project actions</summary><div><p>Managed by <b>{project.manager.name}</b></p>{canManageProject(project) && <button type="button" onClick={() => document.getElementById(`edit-${project.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>Edit project</button>}{canManageProject(project) && <button type="button" onClick={() => void mutate(project.archived ? "Project restored." : "Project archived.", () => request(`/api/projects/${project.id}/archive`, "PATCH", { archived: !project.archived }))}>{project.archived ? "Restore project" : "Archive project"}</button>}{isAdmin && <button className="menu-danger" type="button" onClick={() => { if (window.confirm(`Delete “${project.name}” and all its tasks and comments? This cannot be undone.`)) void mutate("Project deleted.", () => request(`/api/projects/${project.id}`, "DELETE")); }}>Delete project</button>}</div></details></div>
            <div className="project-stats"><div><span>Tasks</span><b>{project.tasks.length}</b></div><div><span>Team</span><b>{project.memberships?.length || 0}</b></div><div className="project-progress"><div><span>Progress</span><b>{progress}%</b></div><div className="progress-track"><i style={{ width: `${progress}%` }} /></div></div></div>
            {canManageProject(project) && <details className="disclosure" id={`edit-${project.id}`}><summary>Edit project details</summary><form className="inline-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const data: Record<string, string> = { name: String(form.get("name")), description: String(form.get("description")) }; if (isAdmin) data.managerId = String(form.get("managerId")); void mutate("Project details saved.", () => request(`/api/projects/${project.id}`, "PATCH", data)); }}><label>Project name<input name="name" defaultValue={project.name} maxLength={100} required /></label><label>Description<input name="description" defaultValue={project.description} maxLength={1000} /></label>{isAdmin && <label>Project Manager<select name="managerId" defaultValue={project.manager.id}>{users.filter((account) => account.active && account.role === "PROJECT_MANAGER").map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>}<button className="button button-secondary button-small" disabled={busy}>Save changes</button></form></details>}
            {canManageProject(project) && <details className="disclosure"><summary>Add a task</summary><form className="inline-form" onSubmit={(event) => createTask(project, event)}><label>Task name<input name="title" placeholder="Describe the next step" maxLength={200} required /></label><label>Description<input name="description" placeholder="Optional details" maxLength={2000} /></label><label>Assign to<select name="assigneeId" defaultValue=""><option value="">Unassigned</option>{(project.memberships || []).filter((member) => member.user.role === "TEAM_MEMBER").map((member) => <option key={member.userId} value={member.userId}>{member.user.name}</option>)}</select></label><button className="button button-secondary button-small" disabled={busy}>Create task</button></form></details>}
            <div className="project-task-preview"><div className="preview-heading"><b>Task list</b><span>{taskMatches.length} {taskMatches.length === 1 ? "task" : "tasks"}</span></div>{taskMatches.slice(0, 3).map((task) => <div className="preview-task" key={task.id}><span className={`task-dot dot-${task.status.toLowerCase()}`} /><span>{task.title}</span><StatusPill status={task.status} /></div>)}{taskMatches.length > 3 && <button className="text-button" onClick={() => setView("Tasks")}>View all {taskMatches.length} tasks →</button>}{taskMatches.length === 0 && <p className="small-muted">No tasks match this filter.</p>}</div>
            <div className="project-card-footer"><span className="manager-avatar avatar">{initials(project.manager.name)}</span><span>Project Manager <b>{project.manager.name}</b></span><button className="text-button" onClick={() => setView("Team")}>Manage team →</button></div>
          </div></article>;
        })}</div>}
      </>}

      {view === "Tasks" && <><SectionHeading eyebrow="KEEP WORK MOVING" title="Tasks" description="A clear view of the next steps across your projects." /><div className="task-toolbar"><div className="filter-tabs" role="group" aria-label="Filter tasks by status">{[["ALL", "All tasks"], ["TODO", "To do"], ["IN_PROGRESS", "In progress"], ["DONE", "Done"]].map(([value, label]) => <button key={value} className={statusFilter === value ? "selected" : ""} onClick={() => setStatusFilter(value)}>{label}{value === "ALL" && <span>{totalTasks}</span>}</button>)}</div><span className="task-result-count">{tasks.length} shown</span></div>{tasks.length === 0 ? <EmptyState title="Nothing on your task list" text={query || statusFilter !== "ALL" ? "Try clearing a filter or changing your search." : "When a task is assigned to you or added to your project, it will show up here."} /> : <div className="task-list">{tasks.map(({ project, ...task }) => <TaskCard key={`${task.id}-${task.version}`} task={task} project={project} user={user} busy={busy} canManageProject={canManageProject(project)} onUpdate={(current, data) => void mutate("Task updated.", () => request(`/api/tasks/${current.id}`, "PATCH", { ...data, version: current.version }))} onStatus={(current, status) => void mutate("Task status updated.", () => request(`/api/tasks/${current.id}`, "PATCH", { status, version: current.version }))} onDelete={(current) => { if (window.confirm(`Delete “${current.title}”? This cannot be undone.`)) void mutate("Task deleted.", () => request(`/api/tasks/${current.id}`, "DELETE")); }} onComment={(current, body) => mutate("Comment added.", () => request(`/api/tasks/${current.id}/comments`, "POST", { body }))} onDeleteComment={(comment) => { if (window.confirm("Delete this comment?")) void mutate("Comment deleted.", () => request(`/api/comments/${comment.id}`, "DELETE")); }} />)}</div>}</>}

      {view === "Team" && <><SectionHeading eyebrow="PEOPLE & ACCESS" title="Team" description="See who is part of each project and manage project-scoped roles." />{projects.length === 0 ? <EmptyState title="No project teams yet" text="Teams appear here when you have access to a project." /> : <div className="team-project-list">{projects.map((project) => <section className="surface-card team-project" key={project.id}><div className="team-project-heading"><span className="project-avatar">{initials(project.name)}</span><div><h2>{project.name}</h2><p>Project Manager: {project.manager.name}</p></div><span className="member-count">{project.memberships?.length || 0} members</span></div>{(project.memberships || []).length ? <div className="member-table"><div className="member-table-head"><span>MEMBER</span><span>ACCOUNT ROLE</span><span>PROJECT ROLE</span>{canManageProject(project) && <span>MANAGE</span>}</div>{project.memberships?.map((membership) => <div className="member-row" key={membership.userId}><span className="member-identity"><span className="avatar avatar-small">{initials(membership.user.name)}</span><span><b>{membership.user.name}</b><small>{membership.user.email}</small></span></span><span><span className={`role-label role-${membership.user.role.toLowerCase()}`}>{membership.user.role.replaceAll("_", " ")}</span></span>{canManageProject(project) ? <span><select aria-label={`Project role for ${membership.user.name}`} value={membership.role} disabled={busy} onChange={(event) => void mutate("Project role updated.", () => request(`/api/projects/${project.id}/members/${membership.userId}`, "PATCH", { role: event.target.value }))}><option value="MANAGER">Manager · project only</option><option value="MEMBER">Member</option><option value="VIEWER">Viewer</option></select></span> : <span><span className="project-role-pill">{membership.role}</span></span>}{canManageProject(project) && <span><button className="button button-danger-quiet button-small" disabled={busy} onClick={() => { if (window.confirm(`Remove ${membership.user.name} from ${project.name}?`)) void mutate("Member removed.", () => request(`/api/projects/${project.id}/members/${membership.userId}`, "DELETE")); }}>Remove</button></span>}</div>)}</div> : <p className="empty-members">No members have been added to this project yet.</p>}{canManageProject(project) && <form className="add-member-form" onSubmit={(event) => { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); void mutate("Member added to project.", () => request(`/api/projects/${project.id}/members`, "POST", { userId: form.get("userId"), role: form.get("role") })).then((saved) => { if (saved) formElement.reset(); }); }}><label>Member user ID<input name="userId" placeholder="Paste the user's account ID" required /></label><label>Project role<select name="role"><option value="MEMBER">Member</option><option value="VIEWER">Viewer</option><option value="MANAGER">Manager · project only</option></select></label><button className="button button-secondary button-small" disabled={busy}>＋ Add member</button><p>Project roles only affect this project; they do not change account permissions.</p></form>}</section>)}</div>}</>}

      {view === "Admin" && isAdmin && <><SectionHeading eyebrow="WORKSPACE SETTINGS" title="Administration" description="Manage NeoStats accounts and their organization-wide access." /><section className="surface-card admin-create-card"><div className="form-card-title"><div><h2>Create a user</h2><p>Choose the account’s global role. Project roles are managed separately.</p></div><span className="create-project-icon">＋</span></div><form className="form-grid" onSubmit={createUser}><label>Full name<input name="name" maxLength={100} placeholder="Name" required /></label><label>Email address<input name="email" type="email" placeholder="name@company.com" required /></label><label>Temporary password<input name="password" type="password" minLength={10} autoComplete="new-password" placeholder="At least 10 characters" required /></label><label>Account role<select name="role" defaultValue="TEAM_MEMBER"><option value="ADMIN">Admin</option><option value="PROJECT_MANAGER">Project Manager</option><option value="TEAM_MEMBER">Team Member</option><option value="VIEWER">Viewer</option></select></label><div className="form-submit"><button className="button button-primary" disabled={busy}>{busy ? "Creating…" : "Create account"}</button></div></form></section><section className="surface-card user-management-card"><div className="card-heading"><div><h2>User accounts</h2><p>{users.length} accounts · inactive users cannot sign in</p></div></div>{users.length === 0 ? <EmptyState title="No accounts found" text="User accounts will appear here." /> : <div className="user-list">{users.map((account) => <details className="user-row" key={account.id}><summary><span className="member-identity"><span className="avatar avatar-small">{initials(account.name)}</span><span><b>{account.name}</b><small>{account.email}</small></span></span><span className={`role-label role-${account.role.toLowerCase()}`}>{account.role.replaceAll("_", " ")}</span><span className={`account-state ${account.active ? "active-state" : "inactive-state"}`}><i />{account.active ? "Active" : "Inactive"}</span><span className="user-row-action">Edit details <b>⌄</b></span></summary><div className="user-edit-panel"><form className="user-edit-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void mutate("User account updated.", () => request(`/api/users/${account.id}`, "PATCH", { name: form.get("name"), email: form.get("email"), role: form.get("role"), password: form.get("password") || undefined })); }}><label>Name<input name="name" defaultValue={account.name} maxLength={100} required /></label><label>Email<input name="email" type="email" defaultValue={account.email} required /></label><label>Global role<select name="role" defaultValue={account.role}><option value="ADMIN">Admin</option><option value="PROJECT_MANAGER">Project Manager</option><option value="TEAM_MEMBER">Team Member</option><option value="VIEWER">Viewer</option></select></label><label>Reset password <span className="field-hint">optional, 10+ characters</span><input name="password" type="password" minLength={10} autoComplete="new-password" placeholder="Leave blank to keep current" /></label><div className="user-form-actions"><button className="button button-secondary button-small" disabled={busy}>Save changes</button>{account.active && account.id !== user.id && <button className="button button-danger-quiet button-small" type="button" disabled={busy} onClick={() => { if (window.confirm(`Deactivate ${account.name}? They will no longer be able to sign in.`)) void mutate("User deactivated.", () => request(`/api/users/${account.id}/deactivate`, "PATCH", {})); }}>Deactivate account</button>}</div></form><p className="account-id">Account ID <code>{account.id}</code></p></div></details>)}</div>}</section></>}
      {view === "Admin" && !isAdmin && <EmptyState title="Admin access required" text="Only administrators can manage user accounts." />}
      <footer className="page-footer"><span>NeoStats workspace</span><span>Changes save automatically when you submit a form.</span></footer>
    </div></section>
  </main>;
}
