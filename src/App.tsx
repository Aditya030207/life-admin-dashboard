import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Leaf,
  Plus,
  Search,
  ShieldCheck,
  X,
  Download,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  attention,
  kinds,
  localDate,
  money,
  recordSchema,
  removeRecord,
  type Data,
  type RecordItem,
} from "./domain";
import { load, save } from "./storage";
import "./App.css";
const blank = (): RecordItem => ({
  id: crypto.randomUUID(),
  title: "",
  kind: "Bill",
  category: "Personal",
  due: "",
  amount: 0,
  notes: "",
  contact: "",
  done: false,
});
function App() {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [view, setView] = useState("Overview"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All"),
    [edit, setEdit] = useState<RecordItem | null>(null),
    [detail, setDetail] = useState<string | null>(null),
    [category, setCategory] = useState(""),
    [rename, setRename] = useState<string | null>(null),
    [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    load()
      .then(setData)
      .catch(() =>
        setError(
          "Unable to open browser storage. Please enable site storage and reload.",
        ),
      );
  }, []);
  useEffect(() => {
    if (edit) dialog.current?.showModal();
    else dialog.current?.close();
  }, [edit]);
  async function update(next: Data) {
    setBusy(true);
    setError("");
    try {
      await save(next);
      setData(next);
      return true;
    } catch {
      setError(
        "Could not save. Browser storage may be full or unavailable. Your previous data is unchanged.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <main className="loading">
        <Leaf />
        <h1>Life, in order.</h1>
        <p role="status">{error || "Opening your dashboard…"}</p>
      </main>
    );
  const today = localDate(),
    due = attention(data.records, today),
    overdue = due.filter((r) => r.due < today),
    thisMonth = due.filter((r) => r.due.slice(0, 7) === today.slice(0, 7)),
    selected = data.records.find((r) => r.id === detail);
  const records = data.records.filter(
    (r) =>
      (filter === "All" || r.kind === filter) &&
      `${r.title} ${r.notes} ${r.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const activeReminders = data.reminders
    .filter((r) => !r.done)
    .sort((a, b) => a.due.localeCompare(b.due));
  const newRecord = () => {
    setEdit({ ...blank(), category: data.categories[0] });
    setError("");
  };
  const row = (r: RecordItem) => (
    <button className="record-row" key={r.id} onClick={() => setDetail(r.id)}>
      <span className={`record-icon ${r.kind.toLowerCase()}`}>
        <FileText size={19} />
      </span>
      <span className="record-name">
        <strong>{r.title}</strong>
        <small>
          {r.kind} <span>·</span> {r.category}
        </small>
      </span>
      <span className="row-date">
        {r.due
          ? new Date(`${r.due}T12:00:00`).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })
          : "No due date"}
      </span>
      <span
        className={`badge ${r.done ? "complete" : r.due && r.due < today ? "late" : ""}`}
      >
        {r.done ? "Completed" : r.due && r.due < today ? "Overdue" : "Upcoming"}
      </span>
      <span className="row-amount">{r.amount ? money(r.amount) : "—"}</span>
      <ChevronRight size={16} />
    </button>
  );
  return (
    <div className="app">
      <aside>
        <a className="brand" href="#" onClick={() => setView("Overview")}>
          <span>
            <Leaf size={22} />
          </span>
          life admin<span className="brand-dot">.</span>
        </a>
        <p className="nav-label">YOUR WORKSPACE</p>
        <nav>
          {[
            [LayoutDashboard, "Overview"],
            [FolderOpen, "All records"],
            [Bell, "Reminders"],
            [FileText, "Categories"],
          ].map(([Icon, name]) => {
            const C = Icon as typeof Leaf;
            return (
              <button
                key={String(name)}
                className={view === name ? "active" : ""}
                onClick={() => {
                  setView(String(name));
                  setDetail(null);
                }}
              >
                <C size={19} />
                {String(name)}
                {name === "Reminders" && <em>{activeReminders.length}</em>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy">
            <ShieldCheck size={22} />
            <strong>A little more peace of mind.</strong>
            <p>Your life admin, organized in one quiet place.</p>
          </div>
          <div className="profile">
            <span>A</span>
            <div>
              <strong>My workspace</strong>
              <small>Local demo · INR</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <span>
            Workspace <ChevronRight size={14} /> <strong>{view}</strong>
          </span>
          <span className="today">
            <CalendarDays size={16} />
            {new Date().toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <p className="eyebrow">A CLEARER HEAD STARTS HERE</p>
              <h1>
                {view === "Overview" ? "Life, a little more organized." : view}
              </h1>
              <p className="subtitle">
                {view === "Overview"
                  ? "The important things, all in one place. Let’s take care of what’s next."
                  : "Keep the details together, so nothing slips through."}
              </p>
            </div>
            <button className="primary" onClick={newRecord}>
              <Plus size={18} /> Add record
            </button>
          </div>
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="notice">
              {notice}
              <button
                onClick={() => setNotice("")}
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </p>
          )}
          {view === "Overview" && (
            <>
              <div className="stats">
                <article>
                  <span>
                    Needs attention <Bell size={17} />
                  </span>
                  <strong>{due.length}</strong>
                  <small>
                    {overdue.length} overdue · {thisMonth.length} this month
                  </small>
                </article>
                <article>
                  <span>
                    Due this month <CalendarDays size={17} />
                  </span>
                  <strong>
                    {money(thisMonth.reduce((sum, r) => sum + r.amount, 0))}
                  </strong>
                  <small>Across bills, renewals & subscriptions</small>
                </article>
                <article>
                  <span>
                    All your records <FolderOpen size={17} />
                  </span>
                  <strong>
                    {data.records.length.toString().padStart(2, "0")}
                  </strong>
                  <small>Every important detail, in one place</small>
                </article>
                <article className="green-stat">
                  <span>
                    Taken care of <Check size={17} />
                  </span>
                  <strong>
                    {data.records
                      .filter((r) => r.done)
                      .length.toString()
                      .padStart(2, "0")}
                  </strong>
                  <small>A little less on your mind</small>
                </article>
              </div>
              <div className="dashboard-grid">
                <section className="panel attention">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">YOUR MONTH AT A GLANCE</p>
                      <h2>What needs attention this month</h2>
                    </div>
                    <span className="count">{due.length} items</span>
                  </div>
                  {overdue.length > 0 && (
                    <div className="overdue-note">
                      <span className="dot" />
                      {overdue.length} overdue{" "}
                      {overdue.length === 1 ? "item needs" : "items need"} a
                      little attention
                    </div>
                  )}
                  <div>
                    {due.length ? (
                      due.map(row)
                    ) : (
                      <div className="empty">
                        <Check />
                        <h3>All caught up.</h3>
                        <p>No open records due through this month.</p>
                      </div>
                    )}
                  </div>
                  <button
                    className="panel-link"
                    onClick={() => setView("All records")}
                  >
                    View all records <ArrowUpRight size={15} />
                  </button>
                </section>
                <div className="right-column">
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>Coming up</h2>
                      <Bell size={18} />
                    </div>
                    {activeReminders.slice(0, 4).map((r) => (
                      <button
                        className="reminder-preview"
                        key={r.id}
                        onClick={() => setDetail(r.recordId)}
                      >
                        <span className="calendar-tile">
                          {r.due.slice(8)}
                          <small>
                            {new Date(`${r.due}T12:00:00`).toLocaleDateString(
                              "en",
                              { month: "short" },
                            )}
                          </small>
                        </span>
                        <span>
                          <strong>{r.title}</strong>
                          <small>
                            {
                              data.records.find((x) => x.id === r.recordId)
                                ?.title
                            }
                          </small>
                        </span>
                      </button>
                    ))}
                    {!activeReminders.length && (
                      <p className="empty">
                        No open reminders. Add one inside a record.
                      </p>
                    )}
                    <button
                      className="panel-link"
                      onClick={() => setView("Reminders")}
                    >
                      Manage reminders <ArrowUpRight size={15} />
                    </button>
                  </section>
                  <section className="tip">
                    <Leaf size={27} />
                    <h3>Small steps. Lighter days.</h3>
                    <p>
                      Set aside ten minutes each week to review your renewals
                      and upcoming bills. Future you will thank you.
                    </p>
                    <span>THE LIFE ADMIN HABIT</span>
                  </section>
                </div>
              </div>
              <section className="quick">
                <div>
                  <h2>Everything has a place.</h2>
                  <p>Explore your records by type.</p>
                </div>
                <div className="type-grid">
                  {kinds.map((k) => (
                    <button
                      key={k}
                      onClick={() => {
                        setFilter(k);
                        setView("All records");
                      }}
                    >
                      <FolderOpen size={20} />
                      <strong>{k}</strong>
                      <small>
                        {data.records.filter((r) => r.kind === k).length}{" "}
                        records
                      </small>
                      <ArrowUpRight size={14} />
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
          {view === "All records" && (
            <section className="panel">
              <div className="tools">
                <label className="search">
                  <Search size={18} />
                  <input
                    placeholder="Search records…"
                    aria-label="Search records"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Filter by type"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  {["All", ...kinds].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </div>
              {records.map(row)}
              {!records.length && (
                <p className="empty">
                  No records found. Try another search or add your first record.
                </p>
              )}
            </section>
          )}
          {view === "Categories" && (
            <section className="panel category-panel">
              <h2>Organize your categories</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const name = category.trim();
                  if (
                    !name ||
                    data.categories.some(
                      (c) =>
                        c.toLowerCase() === name.toLowerCase() && c !== rename,
                    )
                  ) {
                    setError("Use a unique category name.");
                    return;
                  }
                  const next = {
                    ...data,
                    categories: rename
                      ? data.categories.map((c) => (c === rename ? name : c))
                      : [...data.categories, name],
                    records: rename
                      ? data.records.map((r) =>
                          r.category === rename ? { ...r, category: name } : r,
                        )
                      : data.records,
                  };
                  if (await update(next)) {
                    setCategory("");
                    setRename(null);
                  }
                }}
              >
                <label>
                  {rename ? "Rename category" : "New category"}
                  <input
                    required
                    maxLength={40}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </label>
                <button disabled={busy} className="primary">
                  {rename ? "Save" : "Add category"}
                </button>
                {rename && (
                  <button
                    type="button"
                    onClick={() => {
                      setRename(null);
                      setCategory("");
                    }}
                  >
                    Cancel
                  </button>
                )}
              </form>
              {data.categories.map((c) => (
                <div className="category-row" key={c}>
                  <span>
                    <FolderOpen size={18} />
                    {c}
                  </span>
                  <small>
                    {data.records.filter((r) => r.category === c).length}{" "}
                    records
                  </small>
                  <button
                    aria-label={`Rename ${c}`}
                    onClick={() => {
                      setCategory(c);
                      setRename(c);
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    disabled={
                      busy ||
                      data.records.some((r) => r.category === c) ||
                      data.categories.length === 1
                    }
                    title="Only empty categories can be deleted; keep at least one"
                    aria-label={`Delete ${c}`}
                    onClick={() =>
                      update({
                        ...data,
                        categories: data.categories.filter((x) => x !== c),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </section>
          )}
          {view === "Reminders" && (
            <section className="panel category-panel">
              <h2>Your reminders</h2>
              <p>
                Reminders appear here while you use the app. Add or edit them
                inside a record.
              </p>
              {data.reminders.map((r) => (
                <div className="category-row" key={r.id}>
                  <button
                    aria-label={`${r.done ? "Reopen" : "Complete"} ${r.title}`}
                    disabled={busy}
                    onClick={() =>
                      update({
                        ...data,
                        reminders: data.reminders.map((x) =>
                          x.id === r.id ? { ...x, done: !x.done } : x,
                        ),
                      })
                    }
                  >
                    {r.done ? (
                      <Check size={18} />
                    ) : (
                      <span className="checkbox" />
                    )}
                  </button>
                  <button
                    className="reminder-title"
                    onClick={() => setDetail(r.recordId)}
                  >
                    {r.title}
                    <small>
                      {r.due} · {r.done ? "Completed" : "Open"}
                    </small>
                  </button>
                </div>
              ))}
              {!data.reminders.length && (
                <p className="empty">
                  No reminders yet. Open a record to add one.
                </p>
              )}
            </section>
          )}
          <footer>
            <span>
              <ShieldCheck size={14} /> Stored in this browser · Demo data is
              fictional
            </span>
            <span>
              <CircleHelp size={14} /> Built for a little peace of mind
            </span>
          </footer>
        </main>
      </div>
      <dialog ref={dialog} onCancel={() => setEdit(null)}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const parsed = recordSchema.safeParse(edit);
            if (!parsed.success) {
              setError(parsed.error.issues[0].message);
              return;
            }
            if (
              await update({
                ...data,
                records: data.records.some((r) => r.id === parsed.data.id)
                  ? data.records.map((r) =>
                      r.id === parsed.data.id ? parsed.data : r,
                    )
                  : [...data.records, parsed.data],
              })
            ) {
              setEdit(null);
              setNotice("Record saved.");
            }
          }}
        >
          <div className="panel-heading">
            <h2>
              {data.records.some((r) => r.id === edit?.id)
                ? "Edit record"
                : "Add a record"}
            </h2>
            <button
              type="button"
              aria-label="Close form"
              onClick={() => setEdit(null)}
            >
              <X />
            </button>
          </div>
          {edit && (
            <>
              <label>
                Title
                <input
                  autoFocus
                  required
                  maxLength={100}
                  value={edit.title}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                />
              </label>
              <div className="form-grid">
                <label>
                  Type
                  <select
                    value={edit.kind}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        kind: e.target.value as RecordItem["kind"],
                      })
                    }
                  >
                    {kinds.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Category
                  <select
                    value={edit.category}
                    onChange={(e) =>
                      setEdit({ ...edit, category: e.target.value })
                    }
                  >
                    {data.categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Due date
                  <input
                    type="date"
                    value={edit.due}
                    onChange={(e) => setEdit({ ...edit, due: e.target.value })}
                  />
                </label>
                <label>
                  Amount (INR)
                  <input
                    type="number"
                    min="0"
                    max="100000000"
                    step="0.01"
                    value={edit.amount}
                    onChange={(e) =>
                      setEdit({ ...edit, amount: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <label>
                Contact details
                <input
                  maxLength={200}
                  value={edit.contact}
                  onChange={(e) =>
                    setEdit({ ...edit, contact: e.target.value })
                  }
                />
              </label>
              <label>
                Notes
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={edit.notes}
                  onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
                />
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            Save record
          </button>
        </form>
      </dialog>
      {selected && (
        <div className="detail-overlay">
          <section className="detail" aria-label="Record details">
            <div className="panel-heading">
              <span className="eyebrow">
                {selected.kind} / {selected.category}
              </span>
              <button
                aria-label="Close details"
                onClick={() => setDetail(null)}
              >
                <X />
              </button>
            </div>
            <h2>{selected.title}</h2>
            <p className="detail-meta">
              {selected.due || "No due date"} · {money(selected.amount)}
            </p>
            <p className="notes">{selected.notes || "No notes yet."}</p>
            {selected.contact && <p>{selected.contact}</p>}
            <div className="detail-actions">
              <button onClick={() => setEdit(selected)}>
                <Pencil size={16} /> Edit
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  update({
                    ...data,
                    records: data.records.map((r) =>
                      r.id === selected.id ? { ...r, done: !r.done } : r,
                    ),
                  })
                }
              >
                <Check size={16} />
                {selected.done ? "Reopen" : "Mark complete"}
              </button>
              <button
                className="danger"
                disabled={busy}
                onClick={async () => {
                  if (
                    confirm(
                      "Delete this record and its reminders and attachments?",
                    ) &&
                    (await update(removeRecord(data, selected.id)))
                  )
                    setDetail(null);
                }}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
            <h3>Reminders</h3>
            {data.reminders
              .filter((r) => r.recordId === selected.id)
              .map((r) => (
                <form
                  className="reminder-edit"
                  key={r.id}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const title = String(f.get("title")).trim();
                    if (!title) return;
                    await update({
                      ...data,
                      reminders: data.reminders.map((x) =>
                        x.id === r.id
                          ? { ...x, title, due: String(f.get("due")) }
                          : x,
                      ),
                    });
                  }}
                >
                  <input
                    name="title"
                    aria-label="Reminder title"
                    required
                    maxLength={100}
                    defaultValue={r.title}
                  />
                  <input
                    name="due"
                    aria-label="Reminder date"
                    type="date"
                    required
                    defaultValue={r.due}
                  />
                  <button disabled={busy}>Save</button>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Delete reminder ${r.title}`}
                    onClick={() =>
                      update({
                        ...data,
                        reminders: data.reminders.filter((x) => x.id !== r.id),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </form>
              ))}
            <button
              className="text-button"
              disabled={busy}
              onClick={() =>
                update({
                  ...data,
                  reminders: [
                    ...data.reminders,
                    {
                      id: crypto.randomUUID(),
                      recordId: selected.id,
                      title: `Review ${selected.title}`,
                      due: selected.due || today,
                      done: false,
                    },
                  ],
                })
              }
            >
              <Plus size={16} />
              Add reminder
            </button>
            <h3>Attachments</h3>
            <p className="muted">PDF, PNG, JPEG or text · Up to 5 MB each</p>
            {data.attachments
              .filter((a) => a.recordId === selected.id)
              .map((a) => (
                <div className="attachment" key={a.id}>
                  <input
                    aria-label="Attachment name"
                    defaultValue={a.name}
                    maxLength={150}
                    onBlur={(e) => {
                      const name = e.target.value.trim();
                      if (name && name !== a.name)
                        update({
                          ...data,
                          attachments: data.attachments.map((x) =>
                            x.id === a.id ? { ...x, name } : x,
                          ),
                        });
                    }}
                  />
                  <button
                    aria-label={`Download ${a.name}`}
                    onClick={() => {
                      const url = URL.createObjectURL(a.blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = a.name;
                      link.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}
                  >
                    <Download size={16} />
                  </button>
                  <button
                    aria-label={`Delete attachment ${a.name}`}
                    disabled={busy}
                    onClick={() =>
                      update({
                        ...data,
                        attachments: data.attachments.filter(
                          (x) => x.id !== a.id,
                        ),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            <label className="upload">
              Attach a file
              <input
                type="file"
                disabled={busy}
                accept=".pdf,.png,.jpg,.jpeg,.txt"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (
                    file.size > 5 * 1024 * 1024 ||
                    ![
                      "application/pdf",
                      "image/png",
                      "image/jpeg",
                      "text/plain",
                    ].includes(file.type)
                  ) {
                    setError(
                      "Choose a PDF, PNG, JPEG or text file under 5 MB.",
                    );
                    return;
                  }
                  await update({
                    ...data,
                    attachments: [
                      ...data.attachments,
                      {
                        id: crypto.randomUUID(),
                        recordId: selected.id,
                        name: file.name,
                        blob: file,
                      },
                    ],
                  });
                }}
              />
            </label>
            {error && (
              <p role="alert" className="alert">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
export default App;
