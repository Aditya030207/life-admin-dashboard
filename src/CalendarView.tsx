import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { kinds, type RecordItem } from "./domain";
import {
  calendarKeyDate,
  monthCells,
  monthLabel,
  shiftMonth,
} from "./calendar";

type Props = {
  records: RecordItem[];
  today: string;
  onOpen: (id: string) => void;
};
export function CalendarView({ records, today, onOpen }: Props) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const grid = useRef<HTMLDivElement>(null);
  const keyboardFocus = useRef(false);
  useEffect(() => {
    if (keyboardFocus.current) {
      grid.current
        ?.querySelector<HTMLButtonElement>(`button[data-date="${selected}"]`)
        ?.focus();
      keyboardFocus.current = false;
    }
  }, [month, selected]);
  const [type, setType] = useState("All");
  const [showCompleted, setShowCompleted] = useState(false);
  const filtered = records.filter(
    (r) =>
      r.due &&
      (type === "All" || r.kind === type) &&
      (showCompleted || !r.done),
  );
  const byDay = new Map<string, RecordItem[]>();
  for (const record of filtered) {
    const group = byDay.get(record.due) ?? [];
    group.push(record);
    byDay.set(record.due, group);
  }
  const previous = shiftMonth(month, -1),
    next = shiftMonth(month, 1);
  function navigate(target: string | null) {
    if (target) {
      setMonth(target);
      setSelected(`${target}-01`);
    }
  }
  const agenda = (byDay.get(selected) ?? [])
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title));
  return (
    <section className="panel calendar-panel" aria-label="Due date calendar">
      <div className="calendar-controls">
        <div className="month-navigation">
          <button
            aria-label="Previous month"
            disabled={!previous}
            onClick={() => navigate(previous)}
          >
            <ChevronLeft size={18} />
          </button>
          <h2 aria-live="polite">{monthLabel(month)}</h2>
          <button
            aria-label="Next month"
            disabled={!next}
            onClick={() => navigate(next)}
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => {
              setMonth(today.slice(0, 7));
              setSelected(today);
            }}
          >
            Today
          </button>
        </div>
        <div className="calendar-filters">
          <select
            aria-label="Calendar record type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {["All", ...kinds].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <label>
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
            />{" "}
            Include completed
          </label>
        </div>
      </div>
      <p className="muted">
        Select a day to see its records. Items without a due date are available
        in All records.
      </p>
      <p id="calendar-keyboard-help" className="muted">
        Keyboard: arrow keys move by day or week; Home/End move within a week;
        Page Up/Down change months (Shift changes years).
      </p>
      <div
        ref={grid}
        className="calendar-grid"
        role="group"
        aria-label="Month days"
        aria-describedby="calendar-keyboard-help"
      >
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <span className="weekday" key={day}>
            {day}
          </span>
        ))}
        {monthCells(month).map((date, i) =>
          date ? (
            <button
              key={date}
              data-date={date}
              tabIndex={date === selected ? 0 : -1}
              onKeyDown={(event) => {
                if (
                  ![
                    "ArrowLeft",
                    "ArrowRight",
                    "ArrowUp",
                    "ArrowDown",
                    "Home",
                    "End",
                    "PageUp",
                    "PageDown",
                  ].includes(event.key)
                )
                  return;
                event.preventDefault();
                const target = calendarKeyDate(date, event.key, event.shiftKey);
                if (target && target !== selected) {
                  keyboardFocus.current = true;
                  setMonth(target.slice(0, 7));
                  setSelected(target);
                }
              }}
              className={`calendar-day ${date === selected ? "selected" : ""}`}
              aria-label={`${date}, ${byDay.get(date)?.length ?? 0} records`}
              aria-pressed={date === selected}
              aria-current={date === today ? "date" : undefined}
              onClick={() => setSelected(date)}
            >
              <span>{Number(date.slice(8))}</span>
              {!!byDay.get(date)?.length && (
                <small>
                  {byDay.get(date)!.length}
                  <span className="calendar-record-word"> records</span>
                </small>
              )}
            </button>
          ) : (
            <span className="calendar-blank" key={`blank-${i}`} />
          ),
        )}
      </div>
      <div className="calendar-agenda">
        <h3 aria-live="polite">Due on {selected}</h3>
        {agenda.length ? (
          agenda.map((r) => (
            <button
              className="agenda-row"
              key={r.id}
              onClick={() => onOpen(r.id)}
            >
              <span>
                <strong>{r.title}</strong>
                <small>
                  {r.kind} · {r.category}
                </small>
              </span>
              <span className="badge">{r.done ? "Completed" : "Open"}</span>
              <ChevronRight size={16} />
            </button>
          ))
        ) : (
          <p className="empty">
            No records due on this day with these filters.
          </p>
        )}
      </div>
    </section>
  );
}
