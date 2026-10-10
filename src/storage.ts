import { openDB } from "idb";
import { seed, type Data } from "./domain";
const db = () =>
  openDB("life-admin", 1, {
    upgrade(db) {
      db.createObjectStore("state");
    },
  });
export async function load(): Promise<Data> {
  const database = await db();
  const data = await database.get("state", "data");
  if (data) return data;
  const initial = seed();
  await database.put("state", initial, "data");
  return initial;
}
export async function save(data: Data) {
  const database = await db();
  await database.put("state", data, "data");
}
