import { describe, it, expect } from "vitest";
import { computeDue, type Vehicle } from "@/lib/store";

const v: Vehicle = { id: "v", type: "Sedan", model: "X", plate: "P", mileage: 12000, intervals: { oil: { km: 5000, months: 6 }, tire: { km: 40000, months: 48 } } };
const rec = (date: string, mileage: number) => [{ id: "r", vehicleId: "v", kind: "oil" as const, date, mileage, product: "" }];

describe("next service estimate", () => {
  it("adds interval to last service date and mileage", () => {
    const d = computeDue(v, rec("2026-01-10", 10000), "oil", "2026-02-01");
    expect(d.nextDate).toBe("2026-07-10");
    expect(d.nextMileage).toBe(15000);
    expect(d.status).toBe("ok");
  });
  it("is overdue when mileage passes the interval", () => {
    expect(computeDue(v, rec("2026-01-10", 7000), "oil", "2026-02-01").status).toBe("overdue");
  });
  it("is overdue when the date passes", () => {
    expect(computeDue(v, rec("2025-01-10", 11000), "oil", "2026-02-01").status).toBe("overdue");
  });
});
