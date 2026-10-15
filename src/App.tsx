import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
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
  reminderForRecord,
  type Data,
  type RecordItem,
} from "./domain";
import {
  loadSnapshot,
  save,
  StorageConflictError,
  StorageFormatError,
  type Snapshot,
} from "./storage";
import { completeRecord } from "./recurrence";
import { exportBackup, importBackup, MAX_BACKUP_BYTES } from "./backup";
import "./App.css";
import { CalendarView } from "./CalendarView";
import { useModalDialog } from "./useModalDialog";
import { attachmentError } from "./attachments";
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
  const [today, setToday] = useState(() => localDate());
  useEffect(() => {
    const timer = window.setInterval(() => setToday(localDate()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const [exporting, setExporting] = useState(false);
  const [readingBackup, setReadingBackup] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<Data | null>(null);
  const restoreDialog = useRef<HTMLDialogElement>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (pendingRestore) restoreDialog.current?.showModal();
    else restoreDialog.current?.close();
  }, [pendingRestore]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const data = snapshot?.data ?? null;
  const writing = useRef(false);
  const [error, setError] = useState(""),
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
  const detailDialog = useRef<HTMLDialogElement>(null);
  const pageHeading = useRef<HTMLHeadingElement>(null);
  useModalDialog(
    detailDialog,
    Boolean(detail && data?.records.some((r) => r.id === detail)),
    pageHeading,
  );
  useModalDialog(dialog, Boolean(edit), pageHeading);
  useEffect(() => {
    loadSnapshot()
      .then(setSnapshot)
      .catch((cause) =>
        setError(
          cause instanceof StorageFormatError
            ? cause.message
            : "Unable to open browser storage. Please enable site storage and retry.",
        ),
      );
  }, []);

  async function update(next: Data) {
    if (!snapshot || writing.current) return false;
    writing.current = true;
    setBusy(true);
    setError("");
    try {
      setSnapshot(await save(next, snapshot.revision));
      return true;
    } catch (cause) {
      setError(
        cause instanceof StorageConflictError
          ? cause.message
          : "Could not save. Browser storage may be full or unavailable. Your previous data is unchanged.",
      );
      return false;
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  if (!data)
    return (
      <main className="loading">
        <Leaf />
        <h1>Life, in order.</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button
              onClick={() => {
                setError("");
                loadSnapshot()
                  .then(setSnapshot)
                  .catch((cause) =>
                    setError(
                      cause instanceof StorageFormatError
                        ? cause.message
                        : "Browser storage is still unavailable. Enable site storage and try again.",
                    ),
                  );
              }}
            >
              Retry opening workspace
            </button>
          </>
        ) : (
          <p role="status">Opening your dashboard…</p>
        )}
      </main>
    );
  const due = attention(data.records, today),
    overdue = due.filter((r) => r.due < today),
    thisMonth = due.filter((r) => r.due.slice(0, 7) === today.slice(0, 7)),
    selected = data.records.find((r) => r.id === detail);
  const records = data.records.filter(
    (r) =>
      (filter === "All" || r.kind === filter) &&
      `${r.title} ${r.notes} ${r.category} ${r.contact} ${r.contactEmail ?? ""} ${r.contactPhone ?? ""} ${r.contactOrganization ?? ""}`
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
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
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
            [CalendarDays, "Calendar"],
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
            {new Date(`${today}T12:00:00`).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <p className="eyebrow">A CLEARER HEAD STARTS HERE</p>
              <h1 ref={pageHeading} tabIndex={-1}>
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
          {view === "Calendar" && (
            <CalendarView
              records={data.records}
              today={today}
              onOpen={setDetail}
            />
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
                <div className="empty">
                  <p>
                    No records found. Try another search or add your first
                    record.
                  </p>
                  {(query || filter !== "All") && (
                    <button
                      onClick={() => {
                        setQuery("");
                        setFilter("All");
                      }}
                    >
                      Reset record filters
                    </button>
                  )}
                </div>
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
            <button
              disabled={busy || exporting}
              onClick={async () => {
                setExporting(true);
                setError("");
                try {
                  const json = await exportBackup(data);
                  const url = URL.createObjectURL(
                    new Blob([json], { type: "application/json" }),
                  );
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `life-admin-backup-${today}.json`;
                  link.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                  setNotice(
                    "Backup downloaded, including attachments. Keep this unencrypted file somewhere safe. You can restore it using Restore backup.",
                  );
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Could not export your backup. Your saved records are unchanged.",
                  );
                } finally {
                  setExporting(false);
                }
              }}
            >
              <Download size={14} />
              {exporting ? "Preparing backup…" : "Export backup"}
            </button>
            <button
              disabled={busy || readingBackup || exporting}
              onClick={() => backupInput.current?.click()}
            >
              {readingBackup ? "Reading backup…" : "Restore backup"}
            </button>
            <input
              ref={backupInput}
              type="file"
              accept=".json,application/json"
              aria-label="Choose backup file"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setError("");
                setReadingBackup(true);
                try {
                  if (file.size > MAX_BACKUP_BYTES)
                    throw new Error("Backup exceeds the 100 MB limit.");
                  setPendingRestore(importBackup(await file.text()));
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Could not read this backup.",
                  );
                } finally {
                  setReadingBackup(false);
                }
              }}
            />
          </footer>
        </main>
      </div>
      <dialog
        ref={restoreDialog}
        aria-labelledby="restore-title"
        onCancel={() => setPendingRestore(null)}
      >
        <h2 id="restore-title">Replace your workspace?</h2>
        <p>
          This replaces all current records, categories, reminders and
          attachments with the selected backup. Export your current workspace
          first if you want to keep it.
        </p>
        {pendingRestore && (
          <p>
            {pendingRestore.records.length} records ·{" "}
            {pendingRestore.reminders.length} reminders ·{" "}
            {pendingRestore.attachments.length} attachments
          </p>
        )}
        {error && (
          <p role="alert" className="alert">
            {error}
          </p>
        )}
        <button disabled={busy} onClick={() => setPendingRestore(null)}>
          Cancel restore
        </button>
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            if (!pendingRestore) return;
            if (await update(pendingRestore)) {
              setPendingRestore(null);
              setDetail(null);
              setEdit(null);
              setQuery("");
              setFilter("All");
              setNotice("Backup restored, including attachments.");
            }
          }}
        >
          Replace workspace
        </button>
      </dialog>
      <dialog
        ref={dialog}
        aria-labelledby="record-form-title"
        onCancel={() => setEdit(null)}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const previous = data.records.find((r) => r.id === edit?.id);
            const candidate =
              previous &&
              edit &&
              (previous.due !== edit.due ||
                previous.recurrence !== edit.recurrence)
                ? { ...edit, anchorDay: undefined, anchorMonth: undefined }
                : edit;
            const parsed = recordSchema.safeParse(candidate);
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
            <h2 id="record-form-title">
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
                  data-dialog-initial-focus
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
                Repeat
                <select
                  aria-label="Repeat"
                  value={edit.recurrence ?? "none"}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      recurrence: e.target.value as RecordItem["recurrence"],
                    })
                  }
                >
                  <option value="none">Does not repeat</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </label>
              {edit.kind === "Contact" && (
                <fieldset className="contact-fields">
                  <legend>Contact information</legend>
                  <label>
                    Email address
                    <input
                      type="email"
                      maxLength={254}
                      value={edit.contactEmail ?? ""}
                      onChange={(e) =>
                        setEdit({ ...edit, contactEmail: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Phone number
                    <input
                      type="tel"
                      maxLength={60}
                      placeholder="Country code, number and optional extension"
                      value={edit.contactPhone ?? ""}
                      onChange={(e) =>
                        setEdit({ ...edit, contactPhone: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Organization
                    <input
                      maxLength={100}
                      value={edit.contactOrganization ?? ""}
                      onChange={(e) =>
                        setEdit({
                          ...edit,
                          contactOrganization: e.target.value,
                        })
                      }
                    />
                  </label>
                </fieldset>
              )}
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
      <dialog
        ref={detailDialog}
        className="detail-dialog"
        aria-labelledby="detail-title"
        onCancel={() => setDetail(null)}
      >
        {selected && (
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
            <h2 id="detail-title">{selected.title}</h2>
            <p className="detail-meta">
              {selected.due || "No due date"} · {money(selected.amount)}
            </p>
            <p className="notes">{selected.notes || "No notes yet."}</p>
            {selected.contact && <p>{selected.contact}</p>}
            {(selected.contactEmail ||
              selected.contactPhone ||
              selected.contactOrganization) && (
              <dl className="contact-details">
                {selected.contactEmail && (
                  <>
                    <dt>Email</dt>
                    <dd>{selected.contactEmail}</dd>
                  </>
                )}
                {selected.contactPhone && (
                  <>
                    <dt>Phone</dt>
                    <dd>{selected.contactPhone}</dd>
                  </>
                )}
                {selected.contactOrganization && (
                  <>
                    <dt>Organization</dt>
                    <dd>{selected.contactOrganization}</dd>
                  </>
                )}
              </dl>
            )}
            <div className="detail-actions">
              <button onClick={() => setEdit(selected)}>
                <Pencil size={16} /> Edit
              </button>
              <button
                disabled={busy}
                onClick={async () => {
                  try {
                    const next = selected.done
                      ? {
                          ...data,
                          records: data.records.map((r) =>
                            r.id === selected.id ? { ...r, done: false } : r,
                          ),
                        }
                      : completeRecord(data, selected.id);
                    if (await update(next))
                      setNotice(
                        selected.done
                          ? "Record reopened. Existing renewals are kept."
                          : next.records.length > data.records.length
                            ? "Completed. The next renewal has been added."
                            : "Record completed.",
                      );
                  } catch (cause) {
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "Could not complete this record.",
                    );
                  }
                }}
              >
                <Check size={16} />
                {selected.done
                  ? "Reopen"
                  : selected.recurrence && selected.recurrence !== "none"
                    ? "Complete & renew"
                    : "Mark complete"}
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
                    reminderForRecord(selected, today),
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
                  const fileError = attachmentError(file);
                  if (fileError) {
                    setError(fileError);
                    return;
                  }
                  await update({
                    ...data,
                    attachments: [
                      ...data.attachments,
                      {
                        id: crypto.randomUUID(),
                        recordId: selected.id,
                        name: file.name.trim(),
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
        )}
      </dialog>
    </div>
  );
}
export default App;
