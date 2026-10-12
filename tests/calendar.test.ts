import { describe, it, expect } from "vitest";
import { monthCells, shiftMonth, monthLabel } from "../src/calendar";
describe("date-only monthly calendar", () => {
  it("navigates year boundaries and bounds supported years", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("0001-01", -1)).toBeNull();
    expect(shiftMonth("9999-12", 1)).toBeNull();
    expect(() => monthCells("2026-13")).toThrow();
  });
  it("lays out Monday-first complete weeks and handles leap centuries", () => {
    const feb = monthCells("2026-02");
    expect(feb.slice(0, 6)).toEqual(Array(6).fill(null));
    expect(feb[6]).toBe("2026-02-01");
    expect(feb.filter(Boolean)).toHaveLength(28);
    expect(monthCells("2028-02").filter(Boolean)).toHaveLength(29);
    expect(monthCells("2100-02").filter(Boolean)).toHaveLength(28);
    expect(monthCells("2400-02").filter(Boolean)).toHaveLength(29);
    expect(monthCells("2026-03")).toHaveLength(42);
  });
  it("keeps date keys and headings stable in time zones and around DST", () => {
    const original = process.env.TZ;
    try {
      for (const zone of [
        "America/Los_Angeles",
        "Pacific/Kiritimati",
        "Asia/Kolkata",
      ]) {
        process.env.TZ = zone;
        expect(monthLabel("2026-03")).toBe("March 2026");
        expect(monthCells("2026-03").filter(Boolean)).toContain("2026-03-08");
        expect(monthCells("2026-11").filter(Boolean)).toContain("2026-11-01");
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});
