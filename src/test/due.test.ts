import { describe, it, expect } from "vitest";
import {
  addMonths,
  computeDue,
  dueReason,
  isDuplicate,
  type MaintenanceItem,
  type ServiceRecord,
} from "@/lib/store";

const item: MaintenanceItem = {
  id: "i",
  vehicleId: "v",
  type: "oil",
  title: "Engine oil",
  intervalMonths: 6,
  intervalKm: 5000,
};
const settings = { leadDays: 30, leadKm: 1000 };
const rec = (date: string, mileage: number | null): ServiceRecord[] => [
  { id: "r", vehicleId: "v", itemId: "i", date, mileage, createdAt: "" },
];

describe("next service estimate", () => {
  it("adds interval to last service date and mileage", () => {
    const d = computeDue(
      { mileage: 12000 },
      item,
      rec("2026-01-10", 10000),
      settings,
      "2026-02-01",
    );
    expect(d.nextDate).toBe("2026-07-10");
    expect(d.nextMileage).toBe(15000);
    expect(d.status).toBe("ok");
  });
  it("is overdue by mileage when the odometer reaches the due mileage", () => {
    const d = computeDue({ mileage: 12000 }, item, rec("2026-01-10", 7000), settings, "2026-02-01");
    expect(d.status).toBe("overdue");
    expect(d.trigger).toBe("mileage");
  });
  it("is overdue by date when the date passes", () => {
    const d = computeDue(
      { mileage: 12000 },
      item,
      rec("2025-01-10", 11000),
      settings,
      "2026-02-01",
    );
    expect(d.status).toBe("overdue");
    expect(d.trigger).toBe("date");
  });
  it("reports both when both thresholds are past", () => {
    const d = computeDue(
      { mileage: 20000 },
      item,
      rec("2025-01-10", 10000),
      settings,
      "2026-02-01",
    );
    expect(d.trigger).toBe("both");
    expect(dueReason(d)).toMatch(/^Overdue by date and mileage/);
  });
  it("is due soon within the lead window", () => {
    const d = computeDue(
      { mileage: 10000 },
      item,
      rec("2026-01-10", 10000),
      settings,
      "2026-06-20",
    );
    expect(d.status).toBe("soon");
    expect(d.trigger).toBe("date");
  });
  it("does not infer mileage status without a current odometer", () => {
    const kmOnly = { ...item, intervalMonths: null };
    const d = computeDue(
      { mileage: null },
      kmOnly,
      rec("2026-01-10", 10000),
      settings,
      "2026-02-01",
    );
    expect(d.status).toBe("unknown");
    expect(d.mileageUnknown).toBe(true);
    expect(d.kmLeft).toBeUndefined();
  });
  it("has no status before the first record", () => {
    expect(computeDue({ mileage: 0 }, item, [], settings).status).toBe("none");
  });
});

describe("helpers", () => {
  it("clamps month-end dates", () => {
    expect(addMonths("2026-08-31", 6)).toBe("2027-02-28");
  });
  it("detects duplicate records", () => {
    const r = rec("2026-01-10", 10000);
    expect(isDuplicate(r, { itemId: "i", date: "2026-01-10", mileage: 10000 })).toBe(true);
    expect(isDuplicate(r, { itemId: "i", date: "2026-01-10", mileage: 10000 }, "r")).toBe(false);
  });
});
