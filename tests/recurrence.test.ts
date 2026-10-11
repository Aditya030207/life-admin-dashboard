import { describe, it, expect } from "vitest";
import { seed, recordSchema } from "../src/domain";
import { completeRecord, nextDueDate } from "../src/recurrence";
import { exportBackup, importBackup } from "../src/backup";

describe("recurring renewals", () => {
  it("clamps month ends and restores the original day in the next month", () => {
    const data = seed();
    data.records[0] = {
      ...data.records[0],
      due: "2026-01-31",
      recurrence: "monthly",
    };
    const feb = completeRecord(data, data.records[0].id, "feb");
    expect(feb.records.at(-1)?.due).toBe("2026-02-28");
    const mar = completeRecord(feb, "feb", "mar");
    expect(mar.records.at(-1)?.due).toBe("2026-03-31");
    expect(nextDueDate({ ...data.records[0], due: "2027-12-31" })).toBe(
      "2028-01-31",
    );
    expect(nextDueDate({ ...data.records[0], due: "2028-01-31" })).toBe(
      "2028-02-29",
    );
  });
  it("handles leap-day annual renewals across century boundaries", () => {
    const record = {
      ...seed().records[0],
      recurrence: "yearly" as const,
      due: "2028-02-29",
      anchorDay: 29,
      anchorMonth: 2,
    };
    expect(nextDueDate(record)).toBe("2029-02-28");
    expect(nextDueDate({ ...record, due: "2031-02-28" })).toBe("2032-02-29");
    expect(nextDueDate({ ...record, due: "2099-02-28" })).toBe("2100-02-28");
    expect(nextDueDate({ ...record, due: "2399-02-28" })).toBe("2400-02-29");
    expect(() => nextDueDate({ ...record, due: "9999-12-31" })).toThrow(
      "date range",
    );
  });
  it("does not duplicate successors after reopening or copy files and reminders", () => {
    const data = seed();
    data.records[0].recurrence = "monthly";
    const next = completeRecord(data, data.records[0].id, "next");
    expect(next.records).toHaveLength(data.records.length + 1);
    expect(next.attachments).toEqual(data.attachments);
    expect(next.reminders).toEqual(data.reminders);
    expect(completeRecord(next, data.records[0].id)).toBe(next);
    next.records[0].done = false;
    expect(completeRecord(next, data.records[0].id).records).toHaveLength(
      next.records.length,
    );
  });
  it("requires a valid due date and preserves recurrence in backups while accepting old records", async () => {
    const data = seed();
    expect(
      recordSchema.safeParse({
        ...data.records[0],
        due: "",
        recurrence: "monthly",
      }).success,
    ).toBe(false);
    expect(recordSchema.safeParse(data.records[0]).success).toBe(true);
    data.records[0].recurrence = "monthly";
    const next = completeRecord(data, data.records[0].id, "next");
    expect(importBackup(await exportBackup(next)).records).toEqual(
      next.records.map((r) =>
        Object.fromEntries(
          Object.entries(r).filter(([, value]) => value !== undefined),
        ),
      ),
    );
  });
});
