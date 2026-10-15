import { describe, it, expect, vi } from "vitest";
import {
  attachmentError,
  MAX_FILE_BYTES,
  ATTACHMENT_TYPES,
} from "../src/attachments";
import { exportBackup, importBackup } from "../src/backup";
import { seed } from "../src/domain";

describe("consistent attachment and backup limits", () => {
  it("accepts the exact byte boundary and rejects the next byte, unsupported MIME and long names", () => {
    for (const type of ATTACHMENT_TYPES)
      expect(
        attachmentError({ name: "sample", size: MAX_FILE_BYTES, type }),
      ).toBeNull();
    expect(
      attachmentError({
        name: "x.txt",
        size: MAX_FILE_BYTES + 1,
        type: "text/plain",
      }),
    ).toContain("5 MB");
    expect(
      attachmentError({ name: "x.html", size: 1, type: "text/html" }),
    ).not.toBeNull();
    expect(
      attachmentError({ name: "x".repeat(151), size: 1, type: "text/plain" }),
    ).toContain("150");
    expect(
      attachmentError({ name: " ", size: 1, type: "text/plain" }),
    ).not.toBeNull();
  });
  it("round trips an exact-limit binary file through backup export and import", async () => {
    const data = seed();
    const bytes = new Uint8Array(MAX_FILE_BYTES);
    bytes[0] = 255;
    bytes[MAX_FILE_BYTES - 1] = 128;
    data.attachments = [
      {
        id: "file",
        recordId: "demo-0",
        name: "file.png",
        blob: new Blob([bytes], { type: "image/png" }),
      },
    ];
    const restored = importBackup(await exportBackup(data));
    const restoredBytes = new Uint8Array(
      await restored.attachments[0].blob.arrayBuffer(),
    );
    expect(restoredBytes).toHaveLength(MAX_FILE_BYTES);
    expect(restoredBytes[0]).toBe(255);
    expect(restoredBytes.at(-1)).toBe(128);
  });
  it("rejects an oversized aggregate before reading any attachment bytes", async () => {
    const data = seed();
    const blob = new Blob([new Uint8Array(MAX_FILE_BYTES)], {
      type: "image/png",
    });
    const read = vi.spyOn(blob, "arrayBuffer");
    data.attachments = Array.from({ length: 16 }, (_, i) => ({
      id: `file-${i}`,
      recordId: "demo-0",
      name: `file-${i}.png`,
      blob,
    }));
    await expect(exportBackup(data)).rejects.toThrow("100 MB");
    expect(read).not.toHaveBeenCalled();
  });
  it("does not export invalid workspaces or orphaned attachments", async () => {
    const data = seed();
    data.attachments = [
      {
        id: "a",
        recordId: "missing",
        name: "a.txt",
        blob: new Blob(["x"], { type: "text/plain" }),
      },
    ];
    await expect(exportBackup(data)).rejects.toThrow("missing record");
    data.attachments[0].recordId = "demo-0";
    data.attachments[0].name = "x".repeat(151);
    await expect(exportBackup(data)).rejects.toThrow("150");
  });
});
