import type { Data } from "./domain";

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
