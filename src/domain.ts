import { z } from "zod";
export const kinds = [
  "Insurance",
  "Subscription",
  "Document",
  "Renewal",
  "Bill",
  "Appointment",
  "Contact",
] as const;
export const dateSchema = z
  .string()
  .refine(
    (v) =>
      /^\d{4}-\d{2}-\d{2}$/.test(v) &&
      !isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Choose a valid date",
  );
export const recordSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1, "Title is required").max(100),
  kind: z.enum(kinds),
  category: z.string().min(1),
  due: z.union([dateSchema, z.literal("")]),
  amount: z.number().finite().min(0).max(100000000),
  notes: z.string().max(2000),
  contact: z.string().max(200),
  done: z.boolean(),
});
export type RecordItem = z.infer<typeof recordSchema>;
export type Reminder = {
  id: string;
  recordId: string;
  title: string;
  due: string;
  done: boolean;
};
export type Attachment = {
  id: string;
  recordId: string;
  name: string;
  blob: Blob;
};
export type Data = {
  records: RecordItem[];
  categories: string[];
  reminders: Reminder[];
  attachments: Attachment[];
};
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function attention(records: RecordItem[], today = localDate()) {
  return records
    .filter((r) => !r.done && r.due && r.due.slice(0, 7) <= today.slice(0, 7))
    .sort((a, b) => a.due.localeCompare(b.due));
}
export const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
export function seed(): Data {
  const month = localDate().slice(0, 7);
  const rows: [string, RecordItem["kind"], string, string, number, string][] = [
    [
      "Health insurance renewal",
      "Insurance",
      "Personal",
      `${month}-24`,
      12500,
      "Review coverage before renewing.",
    ],
    [
      "Internet bill",
      "Bill",
      "Home",
      `${month}-08`,
      899,
      "Monthly home broadband.",
    ],
    [
      "Design toolkit",
      "Subscription",
      "Work",
      `${month}-18`,
      499,
      "Check whether the annual plan is worthwhile.",
    ],
    [
      "Dental check-up",
      "Appointment",
      "Personal",
      `${month}-22`,
      0,
      "Bring your previous reports.",
    ],
    [
      "Passport copy",
      "Document",
      "Personal",
      "",
      0,
      "Sample document record. Add a demo file.",
    ],
    [
      "Driving licence renewal",
      "Renewal",
      "Personal",
      `${month}-28`,
      500,
      "Check required documents.",
    ],
    [
      "Alex • insurance advisor",
      "Contact",
      "Personal",
      "",
      0,
      "Fictional contact for the demo.",
    ],
  ];
  const records = rows.map(
    ([title, kind, category, due, amount, notes], i) => ({
      id: `demo-${i}`,
      title,
      kind,
      category,
      due,
      amount,
      notes,
      contact: kind === "Contact" ? "alex@example.com" : "",
      done: false,
    }),
  );
  return {
    records,
    categories: ["Personal", "Home", "Work"],
    reminders: [
      {
        id: "reminder-demo",
        recordId: "demo-0",
        title: "Compare insurance coverage",
        due: `${month}-20`,
        done: false,
      },
    ],
    attachments: [],
  };
}
export function removeRecord(data: Data, id: string): Data {
  return {
    ...data,
    records: data.records.filter((r) => r.id !== id),
    reminders: data.reminders.filter((r) => r.recordId !== id),
    attachments: data.attachments.filter((r) => r.recordId !== id),
  };
}
