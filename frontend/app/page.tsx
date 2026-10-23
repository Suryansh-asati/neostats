"use client";
import { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
type User = { id: string; name: string; email: string; role: string };
type Task = {
  id: string;
  title: string;
  description: string;
  status: string;
  version: number;
  assignee?: { name: string } | null;
};
type Project = {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
  manager: { name: string };
};
export default function Home() {
  const [user, setUser] = useState<User | null>(null),
    [projects, setProjects] = useState<Project[]>([]),
    [email, setEmail] = useState("admin@neostats.local"),
    [password, setPassword] = useState("NeoStats123!"),
    [error, setError] = useState("");
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
        setUser(await r.json());
        await load();
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
                        {user.role !== "VIEWER" && (
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
