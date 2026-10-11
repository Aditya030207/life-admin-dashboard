import { z } from "zod";
import { dateSchema, recordSchema, type Data } from "./domain";

/** A portable snapshot. Attachment bytes are base64, never temporary blob URLs. */
export type BackupV1 = {
  format: "life-admin-backup";
  version: 1;
  exportedAt: string;
  data: Omit<Data, "attachments"> & {
    attachments: {
      id: string;
      recordId: string;
      name: string;
      mimeType: string;
      size: number;
      base64: string;
    }[];
  };
};

async function encode(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  // Chunk conversion avoids exceeding function argument limits on larger files.
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

export async function exportBackup(
  data: Data,
  now = new Date(),
): Promise<string> {
  const backup: BackupV1 = {
    format: "life-admin-backup",
    version: 1,
    exportedAt: now.toISOString(),
    data: {
      records: data.records,
      categories: data.categories,
      reminders: data.reminders,
      attachments: await Promise.all(
        data.attachments.map(async (attachment) => ({
          id: attachment.id,
          recordId: attachment.recordId,
          name: attachment.name,
          mimeType: attachment.blob.type,
          size: attachment.blob.size,
          base64: await encode(attachment.blob),
        })),
      ),
    },
  };
  return JSON.stringify(backup, null, 2);
}

export const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const identifier = z.string().min(1).max(200);
const backupSchema = z.object({
  format: z.literal("life-admin-backup"),
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  data: z.object({
    records: z.array(recordSchema.extend({ id: identifier })).max(10000),
    categories: z.array(z.string().trim().min(1).max(40)).min(1).max(1000),
    reminders: z
      .array(
        z.object({
          id: identifier,
          recordId: identifier,
          title: z.string().trim().min(1).max(100),
          due: dateSchema,
          done: z.boolean(),
        }),
      )
      .max(10000),
    attachments: z
      .array(
        z.object({
          id: identifier,
          recordId: identifier,
          name: z.string().trim().min(1).max(150),
          mimeType: z.enum([
            "application/pdf",
            "image/png",
            "image/jpeg",
            "text/plain",
          ]),
          size: z.number().int().min(0).max(MAX_FILE_BYTES),
          base64: z.string().max(Math.ceil(MAX_FILE_BYTES / 3) * 4),
        }),
      )
      .max(1000),
  }),
});
function requireUnique(values: string[], label: string) {
  if (new Set(values).size !== values.length)
    throw new Error(`Backup contains duplicate ${label}.`);
}

/** Validate the complete snapshot before returning any data for persistence. */
export function importBackup(json: string): Data {
  if (new Blob([json]).size > MAX_BACKUP_BYTES)
    throw new Error("Backup exceeds the 100 MB limit.");
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("Choose a valid JSON backup file.");
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success)
    throw new Error(
      "Unsupported or invalid backup. Use a version 1 Life Admin backup.",
    );
  const data = parsed.data.data;
  requireUnique(
    data.records.map((r) => r.id),
    "record identifiers",
  );
  requireUnique(
    data.reminders.map((r) => r.id),
    "reminder identifiers",
  );
  requireUnique(
    data.attachments.map((r) => r.id),
    "attachment identifiers",
  );
  requireUnique(
    data.categories.map((c) => c.toLowerCase()),
    "categories",
  );
  const ids = new Set(data.records.map((r) => r.id));
  if (data.records.some((r) => !data.categories.includes(r.category)))
    throw new Error("A record refers to a missing category.");
  if (
    [...data.reminders, ...data.attachments].some((r) => !ids.has(r.recordId))
  )
    throw new Error("A reminder or attachment refers to a missing record.");
  const attachments = data.attachments.map((file) => {
    let binary: string;
    try {
      binary = atob(file.base64);
    } catch {
      throw new Error("An attachment has invalid file data.");
    }
    if (btoa(binary) !== file.base64 || binary.length !== file.size)
      throw new Error("An attachment has invalid file data or size.");
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return {
      id: file.id,
      recordId: file.recordId,
      name: file.name,
      blob: new Blob([bytes], { type: file.mimeType }),
    };
  });
  return { ...data, attachments };
}
