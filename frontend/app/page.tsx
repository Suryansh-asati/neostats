"use client";
import { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
type User = { id: string; name: string; email: string; role: string; active?: boolean };
type Task = {
  id: string;
  title: string;
  description: string;
  status: string;
  version: number;
  assignee?: { id: string; name: string } | null;
  comments?: { id: string; body: string; author: { name: string } }[];
};
type Project = {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
  manager: { name: string };
  archived?: boolean;
  memberships?: { userId: string; role: string; user: { name: string; email: string } }[];
};
export default function Home() {
  const [user, setUser] = useState<User | null>(null),
    [projects, setProjects] = useState<Project[]>([]),
    [email, setEmail] = useState("admin@neostats.local"),
    [password, setPassword] = useState("NeoStats123!"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [users, setUsers] = useState<User[]>([]);
  async function api(path: string, method = "GET", body?: unknown) {
    const r = await fetch(`${API}${path}`, { method, credentials: "include", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || `HTTP ${r.status}`); }
    return r.status === 204 ? null : r.json();
  }
  async function act(path: string, method: string, body?: unknown) {
    setError(""); setNotice(""); setBusy(true);
    try { await api(path, method, body); setNotice("Saved successfully."); await load(); if (user?.role === "ADMIN") setUsers(await api("/api/users")); }
    catch (e) { setError(e instanceof Error ? e.message : "Request failed"); }
    finally { setBusy(false); }
  }
  async function load() {
    const r = await fetch(`${API}/api/projects`, { credentials: "include" });
    if (r.ok) setProjects(await r.json());
    else if (r.status === 401) setUser(null);
  }
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const r = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error || "Login failed");
      return;
    }
    setUser(d);
    await load();
  }
  async function status(t: Task, next: string) {
    const r = await fetch(`${API}/api/tasks/${t.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: t.version, status: next }),
    });
    if (r.status === 409) {
      setError("This task changed elsewhere. Reloaded the latest version.");
      await load();
      return;
    }
    if (!r.ok) {
      setError((await r.json()).error);
      return;
    }
    await load();
  }
  async function logout() {
    await fetch(`${API}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    setProjects([]);
  }
  useEffect(() => {
    fetch(`${API}/api/auth/me`, { credentials: "include" }).then(async (r) => {
      if (r.ok) {
        const me = await r.json(); setUser(me);
        await load();
        if (me.role === "ADMIN") setUsers(await api("/api/users"));
      }
    });
  }, []);
  return (
    <main>
      <h1>NeoStats</h1>
      <p>Collaborative project management</p>
      {error && (
        <p role="alert" style={{ color: "#b42318" }}>
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}{busy && <p>Saving…</p>}
      {!user ? (
        <form
          onSubmit={login}
          style={{
            background: "white",
            padding: 24,
            borderRadius: 12,
            maxWidth: 380,
          }}
        >
          <h2>Sign in</h2>
          <label>
            Email
            <br />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              style={{ width: "100%", padding: 10, margin: "6px 0 14px" }}
            />
          </label>
          <label>
            Password
            <br />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              style={{ width: "100%", padding: 10, margin: "6px 0 14px" }}
            />
          </label>
          <button>Log in</button>
          <p>Demo: admin@neostats.local / NeoStats123!</p>
        </form>
      ) : (
        <>
          <p>
            Signed in as <b>{user.name}</b> · {user.role}{" "}
            <button onClick={logout} style={{ float: "right" }}>
              Sign out
            </button>
          </p>
          {user.role === "ADMIN" && <form onSubmit={e => { e.preventDefault(); const f=new FormData(e.currentTarget); void act("/api/projects","POST",{name:f.get("name"),description:f.get("description"),managerId:f.get("managerId")||undefined}); e.currentTarget.reset(); }}><h2>Create project</h2><input name="name" placeholder="Project name" required/><input name="description" placeholder="Description"/><input name="managerId" placeholder="Project Manager user ID"/><button disabled={busy}>Create</button></form>}
          {user.role === "ADMIN" && <details><summary>Admin: user management</summary><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void act("/api/users","POST",{name:f.get("name"),email:f.get("email"),password:f.get("password"),role:f.get("role")});}}><input name="name" placeholder="Name" required/><input name="email" type="email" placeholder="Email" required/><input name="password" type="password" minLength={10} placeholder="Temporary password" required/><select name="role"><option>TEAM_MEMBER</option><option>PROJECT_MANAGER</option><option>VIEWER</option><option>ADMIN</option></select><button>Create user</button></form>{users.map(u=><p key={u.id}>{u.name} · {u.email} · {u.role} · {u.active?"active":"inactive"} {u.active&&u.id!==user.id&&<button onClick={()=>void act(`/api/users/${u.id}/deactivate`,"PATCH",{})}>Deactivate</button>}</p>)}</details>}
          {projects.length === 0 ? (
            <p>No projects available.</p>
          ) : (
            projects.map((p) => (
              <section
                key={p.id}
                style={{
                  background: "white",
                  padding: 20,
                  borderRadius: 12,
                  margin: "16px 0",
                }}
              >
                <h2>{p.name}</h2>
                <p>
                  {p.description} · Manager: {p.manager.name}
                </p>
                {(user.role === "ADMIN" || user.role === "PROJECT_MANAGER") && <div><button onClick={()=>void act(`/api/projects/${p.id}`,"PATCH",{name:prompt("Project name",p.name)||p.name})}>Rename</button><button onClick={()=>void act(`/api/projects/${p.id}/archive`,"PATCH",{archived:!p.archived})}>{p.archived?"Unarchive":"Archive"}</button>{user.role==="ADMIN"&&<button onClick={()=>{if(confirm("Delete project and its tasks?"))void act(`/api/projects/${p.id}`,"DELETE")}}>Delete</button>}<form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void act(`/api/projects/${p.id}/tasks`,"POST",{title:f.get("title"),description:f.get("description")});e.currentTarget.reset();}}><input name="title" placeholder="New task" required/><input name="description" placeholder="Details"/><button>Create task</button></form></div>}
                {(user.role === "ADMIN" || user.role === "PROJECT_MANAGER") && <details><summary>Team</summary>{p.memberships?.map(m=><p key={m.userId}>{m.user.name} ({m.role}) <select value={m.role} onChange={e=>void act(`/api/projects/${p.id}/members/${m.userId}`,"PATCH",{role:e.target.value})}><option>MANAGER</option><option>MEMBER</option><option>VIEWER</option></select><button onClick={()=>void act(`/api/projects/${p.id}/members/${m.userId}`,"DELETE")}>Remove</button></p>)}<form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void act(`/api/projects/${p.id}/members`,"POST",{userId:f.get("userId"),role:f.get("role")});e.currentTarget.reset();}}><input name="userId" placeholder="User ID" required/><select name="role"><option>MEMBER</option><option>VIEWER</option><option>MANAGER</option></select><button>Add member</button></form></details>}
                {p.tasks.length === 0 ? (
                  <p>No tasks yet.</p>
                ) : (
                  <ul>
                    {p.tasks.map((t) => (
                      <li key={t.id} style={{ margin: "12px 0" }}>
                        <b>{t.title}</b> — {t.status.replace("_", " ")} · v
                        {t.version} · Assigned:{" "}
                        {t.assignee?.name || "Unassigned"}
                        <br />
                        <small>{t.description}</small>
                        <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void act(`/api/tasks/${t.id}/comments`,"POST",{body:f.get("body")});e.currentTarget.reset();}}><input name="body" placeholder="Add comment" required disabled={user.role==="VIEWER"}/><button disabled={user.role==="VIEWER"}>Comment</button></form>{t.comments?.map(c=><p key={c.id}>{c.author.name}: {c.body}</p>)}
                        {(user.role === "ADMIN" || user.role === "PROJECT_MANAGER" || t.assignee?.id === user.id) && (
                          <select
                            aria-label={`Update status ${t.title}`}
                            value={t.status}
                            onChange={(e) => status(t, e.target.value)}
                            style={{ marginLeft: 12 }}
                          >
                            <option value="TODO">To do</option>
                            <option value="IN_PROGRESS">In progress</option>
                            <option value="DONE">Done</option>
                          </select>
                        )}
                        {(user.role==="ADMIN"||user.role==="PROJECT_MANAGER")&&<button onClick={()=>void act(`/api/tasks/${t.id}`,"DELETE")}>Delete task</button>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))
          )}
        </>
      )}
    </main>
  );
}
