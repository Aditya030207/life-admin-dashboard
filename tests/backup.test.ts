import { describe, it, expect } from "vitest";
import { exportBackup, type BackupV1 } from "../src/backup";
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
