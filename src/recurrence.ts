import { dateSchema, type Data, type RecordItem } from "./domain";

export function nextDueDate(record: RecordItem): string {
  dateSchema.parse(record.due);
  if (!record.recurrence || record.recurrence === "none")
    throw new Error("Choose a recurrence before generating a renewal.");
  const [year, month, day] = record.due.split("-").map(Number);
  const targetMonthIndex =
    record.recurrence === "monthly" ? month : (record.anchorMonth ?? month) - 1;
  const targetYear =
    record.recurrence === "monthly"
      ? year + Math.floor(targetMonthIndex / 12)
      : year + 1;
  if (targetYear > 9999)
    throw new Error("The next renewal exceeds the supported date range.");
  const targetMonth = (targetMonthIndex % 12) + 1;
  const leap =
    targetYear % 4 === 0 && (targetYear % 100 !== 0 || targetYear % 400 === 0);
  const lastDay = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    targetMonth - 1
  ];
  const targetDay = Math.min(record.anchorDay ?? day, lastDay);
  return `${String(targetYear).padStart(4, "0")}-${String(targetMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
}

/** Each completed occurrence creates at most one successor, even after reopening. */
export function completeRecord(
  data: Data,
  id: string,
  newId = crypto.randomUUID(),
): Data {
  const record = data.records.find((r) => r.id === id);
  if (!record || record.done) return data;
  const recurring = record.recurrence && record.recurrence !== "none";
  const createNext = recurring && !record.nextOccurrenceId;
  if (createNext && data.records.some((r) => r.id === newId))
    throw new Error("The next renewal needs a unique identifier.");
  const next = createNext
    ? {
        ...record,
        id: newId,
        due: nextDueDate(record),
        done: false,
        anchorDay: record.anchorDay ?? Number(record.due.slice(8)),
        anchorMonth: record.anchorMonth ?? Number(record.due.slice(5, 7)),
        nextOccurrenceId: undefined,
      }
    : null;
  return {
    ...data,
    records: [
      ...data.records.map((r) =>
        r.id === id
          ? { ...r, done: true, ...(next ? { nextOccurrenceId: newId } : {}) }
          : r,
      ),
      ...(next ? [next] : []),
    ],
  };
}
