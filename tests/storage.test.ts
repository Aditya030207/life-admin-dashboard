import "fake-indexeddb/auto";
import { openDB, deleteDB } from "idb";
import { beforeEach, describe, it, expect } from "vitest";
import { seed } from "../src/domain";
import { loadSnapshot, save, StorageConflictError } from "../src/storage";
beforeEach(async () => {
  await deleteDB("life-admin");
});
async function putRaw(data: unknown, metadata?: unknown) {
  const db = await openDB("life-admin", 1, {
    upgrade(d) {
      d.createObjectStore("state");
    },
  });
  await db.put("state", data, "data");
  if (metadata !== undefined) await db.put("state", metadata, "metadata");
  db.close();
}
describe("versioned transactional snapshots", () => {
  it("migrates legacy data without losing attachment bytes", async () => {
    const data = seed();
    data.records[0].title = "Legacy title";
    data.attachments = [
      {
        id: "a",
        recordId: "demo-0",
        name: "a.txt",
        blob: new Blob(["legacy bytes"]),
      },
    ];
    await putRaw(data);
    const snap = await loadSnapshot();
    expect(snap.data.records[0].title).toBe("Legacy title");
    expect(await snap.data.attachments[0].blob.text()).toBe("legacy bytes");
    expect((await loadSnapshot()).revision).toBe(snap.revision);
  });
  it("seeds concurrent first opens only once and rejects simultaneous stale writers", async () => {
    const [a, b] = await Promise.all([loadSnapshot(), loadSnapshot()]);
    expect(a.revision).toBe(b.revision);
    a.data.records[0].title = "A";
    b.data.records[0].title = "B";
    const results = await Promise.allSettled([
      save(a.data, a.revision),
      save(b.data, b.revision),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason).toBeInstanceOf(
      StorageConflictError,
    );
    expect(["A", "B"]).toContain((await loadSnapshot()).data.records[0].title);
  });
  it("preserves unknown formats and malformed legacy data instead of overwriting them", async () => {
    await putRaw(seed(), {
      format: "life-admin-state",
      version: 2,
      revision: "future",
    });
    await expect(loadSnapshot()).rejects.toThrow("unsupported storage format");
    const db = await openDB("life-admin", 1);
    expect((await db.get("state", "metadata")).version).toBe(2);
    await db.delete("state", "metadata");
    await db.put("state", { broken: true }, "data");
    db.close();
    await expect(loadSnapshot()).rejects.toThrow("preserved");
    const check = await openDB("life-admin", 1);
    expect(await check.get("state", "data")).toEqual({ broken: true });
    check.close();
  });
});
