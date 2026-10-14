import { describe, it, expect } from "vitest";
import "fake-indexeddb/auto";
import { attention, recordSchema, removeRecord, seed } from "../src/domain";
import { load, loadSnapshot, save } from "../src/storage";
describe("monthly attention", () => {
  it("includes overdue across years and excludes completed and future records", () => {
    const base = seed().records[0];
    const records = [
      "2025-12-31",
      "2026-01-01",
      "2026-01-31",
      "2026-02-01",
      "",
    ].map((due, i) => ({ ...base, id: String(i), due }));
    records.push({ ...base, id: "done", due: "2026-01-10", done: true });
    expect(attention(records, "2026-01-15").map((r) => r.id)).toEqual([
      "0",
      "1",
      "2",
    ]);
  });
  it("rejects invalid dates, blank titles and negative amounts", () => {
    const base = seed().records[0];
    for (const patch of [
      { title: "  " },
      { due: "2026-02-30" },
      { amount: -1 },
      { amount: Infinity },
    ])
      expect(recordSchema.safeParse({ ...base, ...patch }).success).toBe(false);
    expect(recordSchema.safeParse({ ...base, due: "2028-02-29" }).success).toBe(
      true,
    );
  });
  it("cascades record deletion without touching other records", () => {
    const data = seed();
    data.attachments.push({
      id: "a",
      recordId: "demo-0",
      name: "test.txt",
      blob: new Blob(["hello"]),
    });
    const next = removeRecord(data, "demo-0");
    expect(next.records).toHaveLength(6);
    expect(next.reminders).toHaveLength(0);
    expect(next.attachments).toHaveLength(0);
  });
  it("persists records and attachment blobs in IndexedDB", async () => {
    const initial = await load();
    initial.records[0].title = "Saved title";
    initial.attachments.push({
      id: "file",
      recordId: "demo-0",
      name: "sample.txt",
      blob: new Blob(["attachment"]),
    });
    await save(initial, (await loadSnapshot()).revision);
    const restored = await load();
    expect(restored.records[0].title).toBe("Saved title");
    expect(await restored.attachments[0].blob.text()).toBe("attachment");
  });
});
