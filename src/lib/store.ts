import { useSyncExternalStore } from "react";

export type ServiceKind = "oil" | "tire";
export type Vehicle = {
  id: string;
  type: string;
  model: string;
  plate: string;
  mileage: number;
  intervals: Record<ServiceKind, { km: number; months: number }>;
};
export type ServiceRecord = {
  id: string;
  vehicleId: string;
  kind: ServiceKind;
  date: string; // YYYY-MM-DD
  mileage: number;
  product: string; // oil type or tire type
  notes?: string | undefined;
};
type State = { vehicles: Vehicle[]; records: ServiceRecord[] };

export const DEFAULT_INTERVALS: Vehicle["intervals"] = {
  oil: { km: 5000, months: 6 },
  tire: { km: 40000, months: 48 },
};
export const KIND_LABEL: Record<ServiceKind, string> = { oil: "Engine oil", tire: "Tires" };

const KEY = "carcare-v1";
const empty: State = { vehicles: [], records: [] };
let state: State = empty;
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch {}
}
function set(next: State) {
  state = next;
  localStorage.setItem(KEY, JSON.stringify(state));
  subs.forEach((f) => f());
}
export function useStore() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      load();
      f();
      return () => subs.delete(f);
    },
    () => (load(), state),
    () => empty,
  );
}
const uid = () => Math.random().toString(36).slice(2, 10);

export const actions = {
  addVehicle(v: Omit<Vehicle, "id" | "intervals">) {
    const id = uid();
    set({ ...state, vehicles: [...state.vehicles, { ...v, id, intervals: structuredClone(DEFAULT_INTERVALS) }] });
    return id;
  },
  updateVehicle(id: string, patch: Partial<Vehicle>) {
    set({ ...state, vehicles: state.vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v)) });
  },
  deleteVehicle(id: string) {
    set({ vehicles: state.vehicles.filter((v) => v.id !== id), records: state.records.filter((r) => r.vehicleId !== id) });
  },
  addRecord(r: Omit<ServiceRecord, "id">) {
    const vehicles = state.vehicles.map((v) =>
      v.id === r.vehicleId && r.mileage > v.mileage ? { ...v, mileage: r.mileage } : v,
    );
    set({ vehicles, records: [...state.records, { ...r, id: uid() }] });
  },
  deleteRecord(id: string) {
    set({ ...state, records: state.records.filter((r) => r.id !== id) });
  },
};

export type DueStatus = "overdue" | "soon" | "ok" | "none";
export type DueInfo = {
  kind: ServiceKind;
  last?: ServiceRecord;
  nextDate?: string;
  nextMileage?: number;
  daysLeft?: number;
  kmLeft?: number;
  status: DueStatus;
};

export function addMonths(date: string, months: number) {
  const d = new Date(date + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
export function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);
}

export function computeDue(v: Vehicle, records: ServiceRecord[], kind: ServiceKind, now = today()): DueInfo {
  const last = records
    .filter((r) => r.vehicleId === v.id && r.kind === kind)
    .sort((a, b) => b.date.localeCompare(a.date) || b.mileage - a.mileage)[0];
  if (!last) return { kind, status: "none" };
  const iv = v.intervals[kind];
  const nextDate = addMonths(last.date, iv.months);
  const nextMileage = last.mileage + iv.km;
  const daysLeft = daysBetween(now, nextDate);
  const kmLeft = nextMileage - v.mileage;
  const status: DueStatus =
    daysLeft < 0 || kmLeft <= 0 ? "overdue" : daysLeft <= 14 || kmLeft <= iv.km * 0.1 ? "soon" : "ok";
  return { kind, last, nextDate, nextMileage, daysLeft, kmLeft, status };
}

export const fmtDate = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
export const fmtKm = (n: number) => `${n.toLocaleString()} km`;
