import { openDB } from "idb";
import { z } from "zod";
import { dateSchema, recordSchema, seed, type Data } from "./domain";
export type Snapshot = { data: Data; revision: string };
export class StorageFormatError extends Error {}
export class StorageConflictError extends Error {
  constructor() {
    super(
      "Another tab saved changes. Your edits weren't saved. Reload this page before trying again.",
    );
    this.name = "StorageConflictError";
  }
}
const metadataSchema = z.object({
  format: z.literal("life-admin-state"),
  version: z.literal(1),
  revision: z.string().min(1),
});
const dataSchema = z.object({
  records: z.array(recordSchema),
  categories: z.array(z.string().min(1)).min(1),
  reminders: z.array(
    z.object({
      id: z.string(),
      recordId: z.string(),
      title: z.string(),
      due: dateSchema,
      done: z.boolean(),
    }),
  ),
  attachments: z.array(
    z.object({
      id: z.string(),
      recordId: z.string(),
      name: z.string(),
      blob: z.instanceof(Blob),
    }),
  ),
});
const db = () =>
  openDB("life-admin", 1, {
    upgrade(database) {
      database.createObjectStore("state");
    },
  });
function validateMetadata(raw: unknown) {
  const result = metadataSchema.safeParse(raw);
  if (!result.success)
    throw new StorageFormatError(
      "This workspace uses an unsupported storage format. Existing data has been preserved.",
    );
  return result.data;
}
export async function loadSnapshot(): Promise<Snapshot> {
  const database = await db();
  const tx = database.transaction("state", "readwrite");
  try {
    const raw = await tx.store.get("data");
    const meta = await tx.store.get("metadata");
    if (meta !== undefined) validateMetadata(meta);
    if (raw === undefined && meta !== undefined)
      throw new StorageFormatError(
        "Workspace data is missing. Existing storage has been preserved.",
      );
    const parsed = dataSchema.safeParse(raw === undefined ? seed() : raw);
    if (!parsed.success)
      throw new StorageFormatError(
        "Workspace data could not be read. Existing storage has been preserved.",
      );
    const data = parsed.data;
    const revision =
      meta === undefined
        ? crypto.randomUUID()
        : validateMetadata(meta).revision;
    if (raw === undefined) await tx.store.put(data, "data");
    if (meta === undefined)
      await tx.store.put(
        { format: "life-admin-state", version: 1, revision },
        "metadata",
      );
    await tx.done;
    return { data, revision };
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* Already aborted or complete. */
    }
    await tx.done.catch(() => {});
    throw error;
  } finally {
    database.close();
  }
}
export async function load(): Promise<Data> {
  return (await loadSnapshot()).data;
}
export async function save(
  data: Data,
  expectedRevision: string,
): Promise<Snapshot> {
  const parsed = dataSchema.parse(data);
  const database = await db();
  const tx = database.transaction("state", "readwrite");
  try {
    const raw = await tx.store.get("metadata");
    if (
      raw === undefined ||
      validateMetadata(raw).revision !== expectedRevision
    )
      throw new StorageConflictError();
    const revision = crypto.randomUUID();
    await tx.store.put(parsed, "data");
    await tx.store.put(
      { format: "life-admin-state", version: 1, revision },
      "metadata",
    );
    await tx.done;
    return { data: parsed, revision };
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* Already aborted or complete. */
    }
    await tx.done.catch(() => {});
    throw error;
  } finally {
    database.close();
  }
}
