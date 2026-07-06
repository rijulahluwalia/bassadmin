import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Calendar as CalendarIcon, ListChecks, Wallet, Users, LogOut, Plus,
  MapPin, Clock, Video, Trash2, Check, ChevronLeft, ChevronRight, X,
  UserPlus, Music, CircleDollarSign, Pencil
} from "lucide-react";

/* ---------- storage helpers (shared across the whole team) ---------- */
const STORE_KEY = "bass-team-data-v1";

const LOGO = "/logo.png";

const seedData = {
  adminProfile: { first: "Admin", last: "" },
  users: [],
  tasks: [
    {
      id: "t1",
      title: "Vivid recap reel",
      type: "Video",
      recordDate: "2026-07-12",
      postDate: "2026-07-15",
      people: 6,
      location: "Darling Harbour",
      status: "Recorded",
      notes: "Golden hour shots near the water",
    },
  ],
  money: [
    { id: "m1", name: "Nav", amount: 300, reason: "Teaching", settled: false, added: "2026-07-06" },
    { id: "m2", name: "Rijul", amount: 36, reason: "Buying the boosting for Instagram", settled: false, added: "2026-07-06" },
  ],
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

async function loadData() {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("bass_store")
        .select("value")
        .eq("key", STORE_KEY)
        .maybeSingle();
      if (!error && data && data.value) return { ...seedData, ...data.value };
    } else {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return { ...seedData, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error("Load failed", e);
  }
  return seedData;
}

async function saveData(d) {
  try {
    if (supabase) {
      await supabase.from("bass_store").upsert({ key: STORE_KEY, value: d });
    } else {
      localStorage.setItem(STORE_KEY, JSON.stringify(d));
    }
  } catch (e) {
    console.error("Save failed", e);
  }
}

/* ---------- little visual bits ---------- */
const BeatBars = ({ size = "md" }) => {
  const h = size === "lg" ? [34, 52, 24, 44, 30] : [14, 22, 10, 18, 12];
  return (
    <div className="beatwrap" aria-hidden="true">
      {h.map((v, i) => (
        <span key={i} className="beat" style={{ height: v, animationDelay: `${i * 0.13}s` }} />
      ))}
    </div>
  );
};

const fmt = (d) => {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

/* ---------- main app ---------- */
export default function App() {
  const [data, setData] = useState(null);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("tasks");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const update = (patch) => {
    setData((prev) => {
      const next = { ...prev, ...patch };
      saveData(next);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="app center-screen">
        <GlobalStyles />
        <BeatBars size="lg" />
        <p className="loading-text">Warming up the dhol…</p>
      </div>
    );
  }

  if (!user) {
    return <Login data={data} update={update} onLogin={setUser} />;
  }

  return (
    <div className="app">
      <GlobalStyles />
      <header className="topbar">
        <div className="brand">
          <img src={LOGO} alt="Bhangra All Stars Sydney" className="logo" />
          <div>
            <h1 className="brand-name"><span className="solid-red">BA</span><span className="outline">SS</span></h1>
            <span className="brand-sub">Bhangra All Stars Sydney</span>
          </div>
        </div>
        <nav className="tabs">
          <TabBtn icon={<ListChecks size={17} />} label="Tasks" active={tab === "tasks"} onClick={() => setTab("tasks")} />
          <TabBtn icon={<CalendarIcon size={17} />} label="Calendar" active={tab === "calendar"} onClick={() => setTab("calendar")} />
          <TabBtn icon={<Wallet size={17} />} label="Money" active={tab === "money"} onClick={() => setTab("money")} />
          {user.isAdmin && (
            <TabBtn icon={<Users size={17} />} label="Team" active={tab === "team"} onClick={() => setTab("team")} />
          )}
        </nav>
        <div className="userchip">
          <span className="avatar">{user.first[0]}</span>
          <span className="uname">{user.first}</span>
          <button className="icon-btn" title="Log out" onClick={() => setUser(null)}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="content fade-in" key={tab}>
        {tab === "tasks" && <Tasks data={data} update={update} />}
        {tab === "calendar" && <CalendarView data={data} />}
        {tab === "money" && <Money data={data} update={update} me={user} />}
        {tab === "team" && user.isAdmin && <Team data={data} update={update} me={user} />}
      </main>
    </div>
  );
}

const TabBtn = ({ icon, label, active, onClick }) => (
  <button className={`tab ${active ? "active" : ""}`} onClick={onClick}>
    {icon}
    <span>{label}</span>
  </button>
);

/* ---------- login ---------- */
function Login({ data, update, onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(false);

  const fail = (msg) => {
    setErr(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const tryLogin = () => {
    const u = username.trim().toLowerCase();
    if (u === "admin" && password === "BassRocks1234") {
      const p = data.adminProfile || { first: "Admin", last: "" };
      onLogin({ id: "admin", first: p.first || "Admin", last: p.last || "", username: "Admin", role: "Admin", isAdmin: true });
      return;
    }
    const match = data.users.find(
      (m) => (m.username || "").trim().toLowerCase() === u && (m.password || "") === password
    );
    if (match) {
      onLogin(match);
    } else {
      fail("No match — check your username and password.");
    }
  };

  const trySignup = () => {
    const u = username.trim();
    if (!first.trim() || !u || !password) {
      fail("Fill in your first name, a username, and a password.");
      return;
    }
    const taken =
      u.toLowerCase() === "admin" ||
      data.users.some((m) => (m.username || "").trim().toLowerCase() === u.toLowerCase());
    if (taken) {
      fail("That username is taken — try another.");
      return;
    }
    const newUser = {
      id: "u" + Date.now(),
      first: first.trim(),
      last: last.trim(),
      username: u,
      password,
      role: "Member",
    };
    update({ users: [...data.users, newUser] });
    onLogin(newUser);
  };

  const submit = () => (mode === "login" ? tryLogin() : trySignup());
  const switchMode = (m) => { setMode(m); setErr(""); };

  return (
    <div className="app center-screen login-bg">
      <GlobalStyles />
      <div className={`login-card ${shake ? "shake" : ""}`}>
        <img src={LOGO} alt="Bhangra All Stars Sydney" className="logo-lg" />
        <p className="login-sub">Team admin hub</p>

        <div className="mode-switch">
          <button className={`mode-btn ${mode === "login" ? "on" : ""}`} onClick={() => switchMode("login")}>Log in</button>
          <button className={`mode-btn ${mode === "signup" ? "on" : ""}`} onClick={() => switchMode("signup")}>Create profile</button>
        </div>

        {mode === "signup" && (
          <div className="grid2" style={{ width: "100%" }}>
            <label className="field">
              <span>First name</span>
              <input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="e.g. Nav" />
            </label>
            <label className="field">
              <span>Last name</span>
              <input value={last} onChange={(e) => setLast(e.target.value)} placeholder="e.g. Singh" />
            </label>
          </div>
        )}

        <label className="field">
          <span>Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={mode === "signup" ? "Pick a username" : "Your username"}
            autoCapitalize="none"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "Pick a password" : "Your password"}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </label>
        {err && <p className="err">{err}</p>}
        <button className="btn primary wide" onClick={submit}>
          {mode === "login" ? "Log in" : "Create profile"}
        </button>
      </div>
    </div>
  );
}

/* ---------- tasks ---------- */
const STATUSES = ["To do", "Recorded", "Edited", "Posted"];

function Tasks({ data, update }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("All");

  const blank = {
    title: "", type: "Video", recordDate: "", postDate: "",
    people: 4, location: "", status: "To do", notes: "",
  };
  const [form, setForm] = useState(blank);

  const openNew = () => { setForm(blank); setEditing(null); setShowForm(true); };
  const openEdit = (t) => { setForm(t); setEditing(t.id); setShowForm(true); };

  const save = () => {
    if (!form.title.trim()) return;
    let tasks;
    if (editing) {
      tasks = data.tasks.map((t) => (t.id === editing ? { ...form, id: editing } : t));
    } else {
      tasks = [...data.tasks, { ...form, id: "t" + Date.now() }];
    }
    update({ tasks });
    setShowForm(false);
  };

  const remove = (id) => update({ tasks: data.tasks.filter((t) => t.id !== id) });
  const setStatus = (id, status) =>
    update({ tasks: data.tasks.map((t) => (t.id === id ? { ...t, status } : t)) });

  const shown = data.tasks
    .filter((t) => filter === "All" || t.status === filter)
    .sort((a, b) => (a.recordDate || "9999").localeCompare(b.recordDate || "9999"));

  const doneCount = data.tasks.filter((t) => t.status === "Posted").length;
  const pct = data.tasks.length ? Math.round((doneCount / data.tasks.length) * 100) : 0;

  return (
    <section>
      <div className="section-head">
        <div>
          <h2>Content & tasks</h2>
          <p className="muted">{data.tasks.length} tasks · {doneCount} posted</p>
        </div>
        <button className="btn primary" onClick={openNew}><Plus size={16} /> New task</button>
      </div>

      <div className="progress-track" title={`${pct}% complete`}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="filters">
        {["All", ...STATUSES].map((s) => (
          <button key={s} className={`chip ${filter === s ? "chip-on" : ""}`} onClick={() => setFilter(s)}>{s}</button>
        ))}
      </div>

      {shown.length === 0 && (
        <div className="empty">No tasks here yet — hit "New task" to add one.</div>
      )}

      <div className="cards">
        {shown.map((t) => (
          <article key={t.id} className={`card status-${t.status.replace(" ", "-").toLowerCase()}`}>
            <div className="card-top">
              <span className="type-pill"><Video size={13} /> {t.type}</span>
              <div className="card-actions">
                <button className="icon-btn" onClick={() => openEdit(t)} title="Edit"><Pencil size={15} /></button>
                <button className="icon-btn danger" onClick={() => remove(t.id)} title="Delete"><Trash2 size={15} /></button>
              </div>
            </div>
            <h3>{t.title}</h3>
            <div className="meta">
              <span><Clock size={14} /> Record: <b>{fmt(t.recordDate)}</b></span>
              <span><CalendarIcon size={14} /> Post: <b>{fmt(t.postDate)}</b></span>
              <span><Users size={14} /> {t.people} people</span>
              <span><MapPin size={14} /> {t.location || "TBC"}</span>
            </div>
            {t.notes && <p className="notes">{t.notes}</p>}
            <div className="status-row">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  className={`status-btn ${t.status === s ? "on" : ""}`}
                  onClick={() => setStatus(t.id, s)}
                >
                  {t.status === s && <Check size={13} />} {s}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      {showForm && (
        <Modal title={editing ? "Edit task" : "New task"} onClose={() => setShowForm(false)}>
          <label className="field"><span>Title</span>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Diwali promo reel" autoFocus />
          </label>
          <div className="grid2">
            <label className="field"><span>Type</span>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {["Video", "Photoshoot", "Post", "Story", "Rehearsal", "Other"].map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label className="field"><span>People required</span>
              <input type="number" min="1" value={form.people} onChange={(e) => setForm({ ...form, people: +e.target.value })} />
            </label>
            <label className="field"><span>Record date</span>
              <input type="date" value={form.recordDate} onChange={(e) => setForm({ ...form, recordDate: e.target.value })} />
            </label>
            <label className="field"><span>Post date</span>
              <input type="date" value={form.postDate} onChange={(e) => setForm({ ...form, postDate: e.target.value })} />
            </label>
          </div>
          <label className="field"><span>Location</span>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Parramatta studio" />
          </label>
          <label className="field"><span>Notes</span>
            <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything the team should know" />
          </label>
          <button className="btn primary wide" onClick={save}>{editing ? "Save changes" : "Add task"}</button>
        </Modal>
      )}
    </section>
  );
}

/* ---------- calendar ---------- */
function CalendarView({ data }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [selected, setSelected] = useState(null);

  const events = useMemo(() => {
    const map = {};
    data.tasks.forEach((t) => {
      if (t.recordDate) (map[t.recordDate] = map[t.recordDate] || []).push({ kind: "Record", task: t });
      if (t.postDate) (map[t.postDate] = map[t.postDate] || []).push({ kind: "Post", task: t });
    });
    return map;
  }, [data.tasks]);

  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const iso = (d) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const monthName = first.toLocaleDateString("en-AU", { month: "long", year: "numeric" });

  const shift = (dir) => {
    let m = month + dir, y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y); setSelected(null);
  };

  return (
    <section>
      <div className="section-head">
        <div>
          <h2>Calendar</h2>
          <p className="muted"><span className="dot rec" /> record day &nbsp; <span className="dot post" /> post day</p>
        </div>
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => shift(-1)}><ChevronLeft size={18} /></button>
          <span className="cal-month">{monthName}</span>
          <button className="icon-btn" onClick={() => shift(1)}><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="cal-grid cal-head">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="cal-cell blank" />;
          const key = iso(d);
          const evs = events[key] || [];
          const isToday = key === todayISO();
          return (
            <button
              key={i}
              className={`cal-cell ${isToday ? "today" : ""} ${evs.length ? "has-ev" : ""} ${selected === key ? "sel" : ""}`}
              onClick={() => setSelected(evs.length ? key : null)}
            >
              <span className="cal-num">{d}</span>
              <div className="cal-evs">
                {evs.slice(0, 3).map((e, j) => (
                  <span key={j} className={`cal-ev-bar ${e.kind === "Record" ? "rec-bar" : "post-bar"}`}>
                    {e.kind === "Record" ? "Rec" : "Post"}
                  </span>
                ))}
                {evs.length > 3 && <span className="cal-more">+{evs.length - 3} more</span>}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="day-panel fade-in">
          <h3>{fmt(selected)}</h3>
          {(events[selected] || []).map((e, i) => (
            <div key={i} className="day-ev">
              <span className={`ev-tag ${e.kind === "Record" ? "rec-tag" : "post-tag"}`}>{e.kind}</span>
              <div>
                <b>{e.task.title}</b>
                <p className="muted small">
                  {e.task.people} people · {e.task.location || "location TBC"} · {e.task.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- money ---------- */
function Money({ data, update, me }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", reason: "" });

  const isAdmin = !!me.isAdmin;
  const mine = (m) =>
    (m.user && me.username && m.user.toLowerCase() === me.username.toLowerCase()) ||
    m.name.trim().toLowerCase() === (me.first || "").trim().toLowerCase();
  const visible = isAdmin ? data.money : data.money.filter(mine);

  const owing = visible.filter((m) => !m.settled);
  const settled = visible.filter((m) => m.settled);
  const total = owing.reduce((s, m) => s + Number(m.amount), 0);

  const add = () => {
    const name = isAdmin ? form.name.trim() : `${me.first} ${me.last}`.trim();
    if (!name || !form.amount) return;
    update({
      money: [
        ...data.money,
        { id: "m" + Date.now(), name, user: isAdmin ? null : me.username, amount: Number(form.amount), reason: form.reason.trim(), settled: false, added: todayISO() },
      ],
    });
    setForm({ name: "", amount: "", reason: "" });
    setShowForm(false);
  };

  const toggle = (id) => update({ money: data.money.map((m) => (m.id === id ? { ...m, settled: !m.settled } : m)) });
  const remove = (id) => update({ money: data.money.filter((m) => m.id !== id) });

  return (
    <section>
      <div className="section-head">
        <div>
          <h2>Money owed</h2>
          <p className="muted">{isAdmin ? "What BASS owes the team" : "What BASS owes you"}</p>
        </div>
        <button className="btn primary" onClick={() => setShowForm(true)}><Plus size={16} /> Add entry</button>
      </div>

      <div className="total-card">
        <CircleDollarSign size={26} />
        <div>
          <span className="total-amt">${total.toFixed(2)}</span>
          <span className="muted small"> {isAdmin ? `owed across ${owing.length} ${owing.length === 1 ? "entry" : "entries"}` : "owed to you"}</span>
        </div>
      </div>

      <div className="cards">
        {owing.map((m) => (
          <article key={m.id} className="card money-card">
            <div className="card-top">
              <span className="avatar big">{m.name[0]}</span>
              <div className="card-actions">
                <button className="icon-btn danger" onClick={() => remove(m.id)} title="Delete"><Trash2 size={15} /></button>
              </div>
            </div>
            <h3>{m.name} is owed <span className="amt">${Number(m.amount).toFixed(2)}</span></h3>
            <p className="notes">{m.reason || "No reason given"}</p>
            <p className="muted small">Added {fmt(m.added)}</p>
            {isAdmin && (
              <button className="btn ghost" onClick={() => toggle(m.id)}><Check size={15} /> Mark as paid</button>
            )}
          </article>
        ))}
      </div>

      {settled.length > 0 && (
        <>
          <h3 className="settled-head">Paid back</h3>
          <div className="cards">
            {settled.map((m) => (
              <article key={m.id} className="card money-card settled">
                <h3>{m.name} — ${Number(m.amount).toFixed(2)}</h3>
                <p className="notes">{m.reason}</p>
                {isAdmin && <button className="btn ghost" onClick={() => toggle(m.id)}>Undo</button>}
              </article>
            ))}
          </div>
        </>
      )}

      {showForm && (
        <Modal title="Add money entry" onClose={() => setShowForm(false)}>
          {isAdmin ? (
            <label className="field"><span>Who is owed?</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Nav" autoFocus />
            </label>
          ) : (
            <label className="field"><span>Who is owed?</span>
              <input value={`${me.first} ${me.last}`.trim()} disabled />
            </label>
          )}
          <label className="field"><span>Amount (AUD)</span>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="300" />
          </label>
          <label className="field"><span>Reason</span>
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Teaching" />
          </label>
          <button className="btn primary wide" onClick={add}>Add entry</button>
        </Modal>
      )}
    </section>
  );
}

/* ---------- team ---------- */
function Team({ data, update, me }) {
  const [form, setForm] = useState({ first: "", last: "", username: "", password: "" });
  const [profile, setProfile] = useState({
    first: (data.adminProfile && data.adminProfile.first) || "Admin",
    last: (data.adminProfile && data.adminProfile.last) || "",
  });
  const [saved, setSaved] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const add = () => {
    const { first, last, username, password } = form;
    if (!first.trim() || !username.trim() || !password) return;
    const taken = data.users.some(
      (u) => (u.username || "").trim().toLowerCase() === username.trim().toLowerCase()
    ) || username.trim().toLowerCase() === "admin";
    if (taken) {
      alert("That username is already taken — pick another.");
      return;
    }
    update({
      users: [
        ...data.users,
        {
          id: "u" + Date.now(),
          first: first.trim(),
          last: last.trim(),
          username: username.trim(),
          password,
          role: "Member",
        },
      ],
    });
    setForm({ first: "", last: "", username: "", password: "" });
  };

  const remove = (id) => update({ users: data.users.filter((u) => u.id !== id) });

  const saveProfile = () => {
    update({ adminProfile: { first: profile.first.trim() || "Admin", last: profile.last.trim() } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <section>
      <div className="section-head">
        <div>
          <h2>Team logins</h2>
          <p className="muted">Create a username and password for each member, then share it with them</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <h3 style={{ marginBottom: 12 }}>Add a member</h3>
        <div className="grid2">
          <label className="field"><span>First name</span>
            <input value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} placeholder="e.g. Nav" />
          </label>
          <label className="field"><span>Last name</span>
            <input value={form.last} onChange={(e) => setForm({ ...form, last: e.target.value })} placeholder="e.g. Singh" />
          </label>
          <label className="field"><span>Username</span>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. nav" autoCapitalize="none" />
          </label>
          <label className="field"><span>Password</span>
            <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Set a password" />
          </label>
        </div>
        <button className="btn primary" onClick={add}><UserPlus size={16} /> Add member</button>
      </div>

      <div className="section-head" style={{ marginBottom: 10 }}>
        <h3>Members</h3>
        <button className="btn ghost" onClick={() => setShowPw(!showPw)}>
          {showPw ? "Hide passwords" : "Show passwords"}
        </button>
      </div>
      {data.users.length === 0 && (
        <div className="empty" style={{ marginBottom: 22 }}>No members yet — add your first one above.</div>
      )}
      <div className="cards" style={{ marginBottom: 26 }}>
        {data.users.map((u) => (
          <article key={u.id} className="card team-card">
            <span className="avatar big">{(u.first || "?")[0]}</span>
            <div className="team-info">
              <h3>{u.first} {u.last}</h3>
              <p className="muted small">
                {u.username ? `@${u.username}` : "No login set — remove and re-add"}
                {showPw && u.password ? ` · ${u.password}` : ""}
              </p>
            </div>
            <button className="icon-btn danger" onClick={() => remove(u.id)} title="Remove"><Trash2 size={15} /></button>
          </article>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 4 }}>Your admin profile</h3>
        <p className="muted small" style={{ marginBottom: 12 }}>The name shown when you're logged in as Admin</p>
        <div className="grid2">
          <label className="field"><span>First name</span>
            <input value={profile.first} onChange={(e) => setProfile({ ...profile, first: e.target.value })} placeholder="e.g. Rijul" />
          </label>
          <label className="field"><span>Last name</span>
            <input value={profile.last} onChange={(e) => setProfile({ ...profile, last: e.target.value })} placeholder="e.g. Ahluwalia" />
          </label>
        </div>
        <button className="btn primary" onClick={saveProfile}>{saved ? "Saved!" : "Save profile"}</button>
        <p className="muted small" style={{ marginTop: 10 }}>Takes effect next time you log in.</p>
      </div>
    </section>
  );
}

/* ---------- modal ---------- */
function Modal({ title, children, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- styles ---------- */
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=DM+Sans:wght@400;500;700&display=swap');

      :root {
        --bg: #161A38;
        --bg2: #1E2348;
        --card: #222850;
        --line: #353C6E;
        --text: #F8F8FC;
        --muted: #9FA6CE;
        --red: #E02830;
        --red-soft: #FF5A62;
        --blue: #9DB6FF;
        --radius: 16px;
      }
      * { box-sizing: border-box; margin: 0; }
      .app {
        min-height: 100vh;
        background:
          radial-gradient(1000px 500px at 85% -10%, rgba(224,40,48,.14), transparent 60%),
          radial-gradient(800px 500px at -10% 110%, rgba(157,182,255,.08), transparent 60%),
          var(--bg);
        color: var(--text);
        font-family: 'DM Sans', system-ui, sans-serif;
        padding-bottom: 60px;
      }
      h1,h2,h3 { font-family: 'Bricolage Grotesque', 'DM Sans', sans-serif; }
      h2 { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
      h3 { font-size: 17px; font-weight: 600; }
      .muted { color: var(--muted); }
      .small { font-size: 12.5px; }

      .logo { width: 46px; height: 46px; object-fit: contain; filter: drop-shadow(0 2px 8px rgba(0,0,0,.4)); }
      .logo-lg {
        width: 150px; height: 150px; object-fit: contain; margin-bottom: 8px;
        filter: drop-shadow(0 6px 22px rgba(0,0,0,.5));
        animation: logoIn .6s cubic-bezier(.2,.9,.3,1.15);
      }
      @keyframes logoIn { from { opacity:0; transform: scale(.85); } to { opacity:1; transform: scale(1); } }

      /* beat bars */
      .beatwrap { display:flex; align-items:flex-end; gap:4px; height:52px; }
      .beat {
        width:6px; border-radius:4px;
        background: linear-gradient(180deg, #FFFFFF, var(--red));
        animation: pulse 1.05s ease-in-out infinite;
        transform-origin: bottom;
      }
      @keyframes pulse { 0%,100% { transform: scaleY(.45); } 50% { transform: scaleY(1); } }

      /* header */
      .topbar {
        display:flex; align-items:center; justify-content:space-between; gap:16px;
        padding: 16px 24px; flex-wrap: wrap;
        border-bottom: 1px solid var(--line);
        background: rgba(22,26,56,.75); backdrop-filter: blur(10px);
        position: sticky; top: 0; z-index: 20;
      }
      .brand { display:flex; align-items:center; gap:14px; }
      .brand .beatwrap { height: 26px; }
      .brand-name { font-size: 24px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
      .solid-red { color: var(--red); }
      .outline { color: transparent; -webkit-text-stroke: 1.5px var(--text); }
      .brand-sub { font-size: 11px; color: var(--muted); letter-spacing: 1.5px; text-transform: uppercase; }
      .tabs { display:flex; gap:6px; flex-wrap:wrap; }
      .tab {
        display:flex; align-items:center; gap:7px;
        background: transparent; border: 1px solid transparent; color: var(--muted);
        padding: 9px 15px; border-radius: 12px; cursor: pointer;
        font-family: inherit; font-size: 14px; font-weight: 500;
        transition: all .22s ease;
      }
      .tab:hover { color: var(--text); background: var(--bg2); }
      .tab.active {
        color: #fff; background: var(--red);
        font-weight: 700; box-shadow: 0 4px 18px rgba(224,40,48,.4);
      }
      .userchip { display:flex; align-items:center; gap:9px; }
      .uname { font-weight: 600; font-size: 14px; }
      .avatar {
        width:32px; height:32px; border-radius:50%;
        background: linear-gradient(135deg, var(--red-soft), var(--red));
        display:flex; align-items:center; justify-content:center;
        font-weight:700; font-size:14px;
      }
      .avatar.big { width:42px; height:42px; font-size:17px; }

      .content { max-width: 1080px; margin: 0 auto; padding: 30px 24px; }
      .fade-in { animation: fadeUp .35s ease; }
      @keyframes fadeUp { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform:none; } }

      .section-head { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; margin-bottom:18px; flex-wrap:wrap; }

      /* buttons */
      .btn {
        display:inline-flex; align-items:center; gap:8px; justify-content:center;
        border:none; cursor:pointer; font-family:inherit; font-weight:700; font-size:13px;
        text-transform: uppercase; letter-spacing: 1px;
        padding: 12px 18px; border-radius: 10px; transition: all .2s ease;
      }
      .btn.primary { background: var(--red); color:#fff; box-shadow: 0 5px 20px rgba(224,40,48,.35); }
      .btn.primary:hover { transform: translateY(-2px); background: var(--red-soft); box-shadow: 0 8px 26px rgba(224,40,48,.5); }
      .btn.ghost { background: transparent; color: var(--text); border:1px solid var(--line); }
      .btn.ghost:hover { border-color: var(--text); }
      .btn.wide { width:100%; margin-top: 6px; }
      .icon-btn {
        background: transparent; border:none; color: var(--muted); cursor:pointer;
        padding:7px; border-radius: 9px; display:inline-flex; transition: all .18s ease;
      }
      .icon-btn:hover { background: var(--bg2); color: var(--text); }
      .icon-btn.danger:hover { color: #FF6B81; }

      /* progress */
      .progress-track { height:8px; border-radius:6px; background: var(--bg2); overflow:hidden; margin-bottom:16px; }
      .progress-fill { height:100%; border-radius:6px; background: linear-gradient(90deg, var(--red), var(--red-soft)); transition: width .6s cubic-bezier(.2,.9,.3,1); }

      .filters { display:flex; gap:8px; margin-bottom: 20px; flex-wrap:wrap; }
      .chip {
        background: var(--bg2); border:1px solid var(--line); color: var(--muted);
        padding: 7px 14px; border-radius: 999px; cursor:pointer; font-family:inherit; font-size:13px;
        transition: all .18s ease;
      }
      .chip:hover { color: var(--text); }
      .chip-on { background: var(--text); color: var(--bg); font-weight:700; border-color: var(--text); }

      /* cards */
      .cards { display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:16px; }
      .card {
        background: var(--card); border:1px solid var(--line); border-radius: var(--radius);
        padding: 18px; transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
        animation: fadeUp .35s ease;
      }
      .card:hover { transform: translateY(-3px); border-color: #5A4278; box-shadow: 0 12px 30px rgba(0,0,0,.35); }
      .card-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
      .card-actions { display:flex; gap:2px; }
      .type-pill {
        display:inline-flex; align-items:center; gap:6px;
        font-size:12px; font-weight:700; letter-spacing:.5px; text-transform: uppercase;
        color: var(--red-soft); background: rgba(224,40,48,.14);
        padding: 5px 11px; border-radius: 999px;
      }
      .status-posted { opacity:.65; }
      .status-posted h3 { text-decoration: line-through; text-decoration-color: var(--blue); }
      .meta { display:flex; flex-wrap:wrap; gap:10px 16px; margin:12px 0; font-size:13px; color: var(--muted); }
      .meta span { display:inline-flex; align-items:center; gap:6px; }
      .meta b { color: var(--text); font-weight:600; }
      .notes { font-size:13.5px; color: var(--muted); border-left: 3px solid var(--line); padding-left: 10px; margin-bottom: 12px; }
      .status-row { display:flex; gap:5px; flex-wrap:wrap; }
      .status-btn {
        flex:1; min-width: 70px; display:inline-flex; align-items:center; justify-content:center; gap:4px;
        background: var(--bg2); border:1px solid var(--line); color: var(--muted);
        font-family:inherit; font-size:11.5px; padding:8px 4px; border-radius: 10px; cursor:pointer;
        transition: all .18s ease;
      }
      .status-btn.on { background: rgba(157,182,255,.14); color: var(--blue); border-color: rgba(157,182,255,.45); font-weight:700; }
      .empty {
        text-align:center; padding: 46px 20px; color: var(--muted);
        border: 1.5px dashed var(--line); border-radius: var(--radius);
      }

      /* calendar */
      .cal-nav { display:flex; align-items:center; gap:8px; }
      .cal-month { font-family:'Bricolage Grotesque'; font-weight:700; font-size:17px; min-width: 150px; text-align:center; }
      .cal-grid { display:grid; grid-template-columns: repeat(7, 1fr); gap:6px; }
      .cal-head { margin-bottom:8px; font-size:12px; color: var(--muted); text-transform:uppercase; letter-spacing:1px; text-align:center; }
      .cal-cell {
        min-height: 86px; border-radius: 12px; border:1px solid var(--line);
        background: var(--card); color: var(--text); cursor: default;
        display:flex; flex-direction:column; align-items:flex-start; gap:5px;
        padding: 8px; font-family:inherit; transition: all .18s ease;
      }
      .cal-cell.blank { background: transparent; border-color: transparent; }
      .cal-cell.has-ev { cursor:pointer; background: rgba(224,40,48,.10); border-color: rgba(224,40,48,.45); }
      .cal-cell.has-ev:hover { border-color: var(--red); transform: translateY(-2px); box-shadow: 0 6px 18px rgba(224,40,48,.25); }
      .cal-cell.today { border-color: var(--blue); box-shadow: 0 0 0 1px var(--blue) inset; }
      .cal-cell.sel { border-color: var(--red); background: rgba(224,40,48,.18); }
      .cal-num { font-size:13px; font-weight:600; }
      .cal-evs { display:flex; flex-direction:column; gap:3px; width:100%; overflow:hidden; }
      .cal-ev-bar {
        width:100%; font-size:10px; font-weight:800; letter-spacing:.4px; text-transform:uppercase;
        padding: 3px 4px; border-radius: 5px; text-align:center;
        white-space:nowrap; overflow:hidden;
      }
      .rec-bar { background: var(--red); color:#fff; }
      .post-bar { background: #FFFFFF; color: var(--bg); }
      .cal-more { font-size:10px; color: var(--muted); font-weight:700; padding-left:2px; }
      .dot { width:9px; height:9px; border-radius:50%; display:inline-block; }
      .dot.rec { background: var(--red); box-shadow: 0 0 8px rgba(224,40,48,.7); }
      .dot.post { background: #FFFFFF; box-shadow: 0 0 8px rgba(255,255,255,.6); }
      .day-panel { margin-top: 20px; background: var(--card); border:1px solid var(--line); border-radius: var(--radius); padding: 18px; }
      .day-panel h3 { margin-bottom: 12px; }
      .day-ev { display:flex; gap:12px; align-items:flex-start; padding:10px 0; border-top:1px solid var(--line); }
      .ev-tag { font-size:11px; font-weight:800; letter-spacing:1px; text-transform:uppercase; padding:4px 9px; border-radius:999px; }
      .rec-tag { background: rgba(224,40,48,.18); color: var(--red-soft); }
      .post-tag { background: rgba(255,255,255,.14); color: #FFFFFF; }

      /* money */
      .total-card {
        display:flex; align-items:center; gap:14px;
        background: linear-gradient(120deg, rgba(224,40,48,.16), rgba(224,40,48,.06));
        border:1px solid rgba(224,40,48,.35);
        border-radius: var(--radius); padding: 18px 22px; margin-bottom: 20px;
        color: var(--red-soft);
      }
      .total-amt { font-family:'Bricolage Grotesque'; font-size: 30px; font-weight: 800; color: var(--text); margin-right: 8px; }
      .amt { color: var(--red-soft); }
      .money-card .btn { margin-top: 10px; width: 100%; }
      .settled-head { margin: 28px 0 12px; color: var(--muted); }
      .card.settled { opacity:.55; }

      /* team */
      .add-row { display:flex; gap:10px; margin-bottom: 22px; flex-wrap:wrap; }
      .add-row input { flex:1; min-width: 150px; }
      .team-card { display:flex; align-items:center; gap:14px; }
      .team-info { flex:1; }

      /* forms */
      .field { display:flex; flex-direction:column; gap:6px; margin-bottom: 14px; }
      .field span { font-size:12.5px; font-weight:600; color: var(--muted); letter-spacing:.3px; }
      input, select, textarea {
        background: var(--bg2); border:1px solid var(--line); color: var(--text);
        border-radius: 11px; padding: 11px 13px; font-family:inherit; font-size:14px;
        outline: none; transition: border-color .18s ease, box-shadow .18s ease; width:100%;
      }
      input:focus, select:focus, textarea:focus { border-color: var(--red); box-shadow: 0 0 0 3px rgba(224,40,48,.18); }
      .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
      .err { color:#FF6B81; font-size:13px; margin-bottom:10px; }

      /* modal */
      .overlay {
        position:fixed; inset:0; background: rgba(10,13,32,.75); backdrop-filter: blur(4px);
        display:flex; align-items:center; justify-content:center; z-index:50; padding: 20px;
      }
      .modal {
        background: var(--card); border:1px solid var(--line); border-radius: 20px;
        padding: 24px; width: 100%; max-width: 460px; max-height: 88vh; overflow:auto;
      }
      .pop-in { animation: pop .28s cubic-bezier(.2,.9,.3,1.2); }
      @keyframes pop { from { opacity:0; transform: scale(.94) translateY(8px); } to { opacity:1; transform:none; } }
      .modal-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }

      /* login */
      .center-screen { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; padding: 20px; }
      .loading-text { margin-top: 18px; color: var(--muted); }
      .login-bg {
        background:
          radial-gradient(700px 400px at 20% 15%, rgba(224,40,48,.20), transparent 60%),
          radial-gradient(700px 400px at 85% 85%, rgba(157,182,255,.10), transparent 60%),
          var(--bg);
      }
      .login-card {
        width:100%; max-width: 400px; background: var(--card);
        border:1px solid var(--line); border-radius: 24px; padding: 36px 30px;
        display:flex; flex-direction:column; align-items:center;
        box-shadow: 0 30px 80px rgba(0,0,0,.5);
        animation: fadeUp .5s ease;
      }
      .login-title { font-size: 46px; font-weight:800; letter-spacing: 6px; margin: 14px 0 4px; text-transform: uppercase; }
      .login-sub { color: var(--muted); font-size: 13px; margin-bottom: 26px; text-align:center; }
      .login-card .field { width:100%; }
      .mode-switch {
        display:flex; width:100%; gap:4px; margin-bottom: 18px;
        background: var(--bg2); border:1px solid var(--line); border-radius: 12px; padding: 4px;
      }
      .mode-btn {
        flex:1; background: transparent; border:none; color: var(--muted);
        font-family:inherit; font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:.5px;
        padding: 9px 6px; border-radius: 9px; cursor:pointer; transition: all .18s ease;
      }
      .mode-btn.on { background: var(--red); color:#fff; }
      .shake { animation: shake .4s ease; }
      @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 50%{transform:translateX(8px)} 75%{transform:translateX(-5px)} }

      @media (max-width: 640px) {
        .topbar { padding: 12px 14px; gap: 12px; }
        .tabs {
          order: 3; width: 100%;
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;
        }
        .tab { justify-content: center; padding: 9px 4px; font-size: 12px; gap: 5px; border: 1px solid var(--line); }
        .tab.active { border-color: var(--red); }
        .brand-name { font-size: 20px; }
        .brand .beatwrap { height: 20px; }
        h2 { font-size: 21px; }
        .content { padding: 20px 12px; }
        .section-head { align-items: center; }
        .grid2 { grid-template-columns: 1fr; }
        .cards { grid-template-columns: 1fr; }
        .cal-grid { gap: 4px; }
        .cal-cell { padding: 4px; border-radius: 8px; min-height: 60px; gap: 3px; }
        .cal-num { font-size: 11px; }
        .cal-ev-bar { padding: 2px 2px; font-size: 8.5px; letter-spacing: .2px; border-radius: 4px; }
        .cal-more { font-size: 9px; }
        .cal-month { font-size: 15px; min-width: 120px; }
        .cal-head { font-size: 10px; letter-spacing: .5px; }
        .total-amt { font-size: 24px; }
        .add-row { flex-direction: column; }
        .add-row input, .add-row .btn { width: 100%; }
        .status-btn { min-width: 62px; font-size: 10.5px; }
        .uname { display:none; }
        .modal { padding: 18px; border-radius: 16px; }
        .login-card { padding: 28px 20px; }
        .login-title { font-size: 38px; }
      }
      @media (prefers-reduced-motion: reduce) {
        *, .beat { animation: none !important; transition: none !important; }
      }
    `}</style>
  );
}
