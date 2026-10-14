import "fake-indexeddb/auto";
import { load, loadSnapshot, save } from "../src/storage";
import { describe, it, expect } from "vitest";
import { exportBackup, importBackup, type BackupV1 } from "../src/backup";
import { seed } from "../src/domain";

describe("portable backup export", () => {
  it("includes records, reminders and categories with an explicit format version", async () => {
    const data = seed();
    const json: BackupV1 = JSON.parse(
      await exportBackup(data, new Date("2026-10-11T00:00:00Z")),
    );
    expect(json.format).toBe("life-admin-backup");
    expect(json.version).toBe(1);
    expect(json.exportedAt).toBe("2026-10-11T00:00:00.000Z");
    expect(json.data).toEqual(data);
  });
  it("preserves every byte and metadata of a large binary attachment without mutating data", async () => {
    const data = seed();
    const bytes = Uint8Array.from({ length: 100000 }, (_, i) => i % 256);
    data.attachments.push({
      id: "file-1",
      recordId: data.records[0].id,
      name: "Résumé.png",
      blob: new Blob([bytes], { type: "image/png" }),
    });
    const backup: BackupV1 = JSON.parse(await exportBackup(data));
    const file = backup.data.attachments[0];
    expect(file).toMatchObject({
      id: "file-1",
      recordId: data.records[0].id,
      name: "Résumé.png",
      mimeType: "image/png",
      size: bytes.length,
    });
    expect(Uint8Array.from(atob(file.base64), (c) => c.charCodeAt(0))).toEqual(
      bytes,
    );
    expect(data.attachments[0].blob).toBeInstanceOf(Blob);
  });
  it("handles empty attachments and an empty workspace", async () => {
    const data = seed();
    data.attachments.push({
      id: "empty",
      recordId: data.records[0].id,
      name: "empty.txt",
      blob: new Blob([], { type: "text/plain" }),
    });
    const backup: BackupV1 = JSON.parse(await exportBackup(data));
    expect(backup.data.attachments[0].base64).toBe("");
    const empty: BackupV1 = JSON.parse(
      await exportBackup({
        records: [],
        categories: ["Personal"],
        reminders: [],
        attachments: [],
      }),
    );
    expect(empty.data.records).toEqual([]);
  });
});

describe("validated backup restore", () => {
  it("round trips records, reminders, categories and binary attachments through storage", async () => {
    const data = seed();
    const bytes = new Uint8Array([0, 255, 128, 65]);
    data.attachments.push({
      id: "binary",
      recordId: data.records[0].id,
      name: "bytes.png",
      blob: new Blob([bytes], { type: "image/png" }),
    });
    const restored = importBackup(await exportBackup(data));
    await save(restored, (await loadSnapshot()).revision);
    const persisted = await load();
    expect(persisted.records).toEqual(data.records);
    expect(persisted.reminders).toEqual(data.reminders);
    expect(persisted.categories).toEqual(data.categories);
    expect(
      new Uint8Array(await persisted.attachments[0].blob.arrayBuffer()),
    ).toEqual(bytes);
    expect(persisted.attachments[0].blob.type).toBe("image/png");
  });
  it("rejects unsupported versions, invalid dates and broken relational references", async () => {
    const original = JSON.parse(await exportBackup(seed()));
    const patches = [
      (b: any) => (b.version = 2),
      (b: any) => (b.data.records[0].due = "2026-02-30"),
      (b: any) => (b.data.records[0].category = "Missing"),
      (b: any) => (b.data.reminders[0].recordId = "Missing"),
      (b: any) => b.data.records.push(b.data.records[0]),
      (b: any) => b.data.categories.push("personal"),
      (b: any) => (b.data.categories = []),
    ];
    for (const patch of patches) {
      const backup = structuredClone(original);
      patch(backup);
      expect(() => importBackup(JSON.stringify(backup))).toThrow();
    }
    expect(() => importBackup("{bad json")).toThrow("valid JSON");
  });
  it("rejects corrupt, noncanonical, oversized or unsafe attachment data", async () => {
    const data = seed();
    data.attachments.push({
      id: "file",
      recordId: data.records[0].id,
      name: "file.txt",
      blob: new Blob(["test"], { type: "text/plain" }),
    });
    const original = JSON.parse(await exportBackup(data));
    for (const patch of [
      { base64: "!invalid" },
      { size: 5 },
      { base64: "dGVzdA" },
      { size: 6 * 1024 * 1024 },
      { mimeType: "text/html" },
    ]) {
      const backup = structuredClone(original);
      Object.assign(backup.data.attachments[0], patch);
      expect(() => importBackup(JSON.stringify(backup))).toThrow();
    }
  });
});
