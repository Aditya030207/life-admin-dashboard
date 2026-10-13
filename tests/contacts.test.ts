import { describe, it, expect } from "vitest";
import { recordSchema, seed } from "../src/domain";
import { importBackup, exportBackup } from "../src/backup";

describe("structured contacts", () => {
  it("accepts legacy contacts, blank optional fields and international display numbers", () => {
    const base = seed().records.find((r) => r.kind === "Contact")!;
    expect(recordSchema.safeParse(base).success).toBe(true);
    expect(
      recordSchema.safeParse({
        ...base,
        contactEmail: "",
        contactPhone: "",
        contactOrganization: "",
      }).success,
    ).toBe(true);
    const parsed = recordSchema.parse({
      ...base,
      contactEmail: "  alex@example.com  ",
      contactPhone: "+44 (0)20 7946 0000 ext 123",
      contactOrganization: "  Example Clinic  ",
    });
    expect(parsed.contactEmail).toBe("alex@example.com");
    expect(parsed.contactOrganization).toBe("Example Clinic");
  });
  it("rejects invalid email and oversized contact fields", () => {
    const base = seed().records[0];
    for (const fields of [
      { contactEmail: "invalid" },
      { contactPhone: "1".repeat(61) },
      { contactOrganization: "x".repeat(101) },
    ])
      expect(recordSchema.safeParse({ ...base, ...fields }).success).toBe(
        false,
      );
  });
  it("round trips structured contact details through version 1 backups", async () => {
    const data = seed();
    Object.assign(data.records[6], {
      contactEmail: "alex@example.com",
      contactPhone: "+91 90000 00000 ext 12",
      contactOrganization: "Example Organization",
    });
    expect(importBackup(await exportBackup(data)).records[6]).toEqual(
      data.records[6],
    );
    const backup = JSON.parse(await exportBackup(data));
    backup.data.records[6].contactEmail = "invalid";
    expect(() => importBackup(JSON.stringify(backup))).toThrow(
      "invalid backup",
    );
  });
});
