import { useSyncExternalStore } from "react";

export type ItemType = "oil" | "tire" | "brakes" | "battery" | "fluids" | "inspection" | "custom";

export type Vehicle = {
  id: string;
  type: string; // body type, e.g. Sedan
  make: string;
  model: string;
  year?: number | undefined;
  nickname?: string | undefined;
  plate?: string | undefined;
  mileage: number | null; // null = odometer not entered yet
  notes?: string | undefined;
  archived?: boolean | undefined;
  createdAt: string;
};
export type MaintenanceItem = {
  id: string;
  vehicleId: string;
  type: ItemType;
  title: string;
  intervalMonths: number | null;
  intervalKm: number | null;
};
export type ServiceRecord = {
  id: string;
  vehicleId: string;
  itemId: string;
  date: string; // YYYY-MM-DD
  mileage: number | null;
  product?: string | undefined; // oil type, tire type, part used...
  cost?: number | undefined;
  provider?: string | undefined;
  notes?: string | undefined;
  createdAt: string;
};
export type Settings = {
  leadDays: number; // "due soon" window before the due date
  leadKm: number; // "due soon" window before the due odometer
  inAppReminders: boolean;
  currency: string;
};
export type State = {
  vehicles: Vehicle[];
  items: MaintenanceItem[];
  records: ServiceRecord[];
  settings: Settings;
};

export const VEHICLE_TYPES = ["Sedan", "Hatchback", "SUV", "Pickup", "Van", "Motorcycle"];

/** Suggested intervals only — not manufacturer guidance (PRD §5). */
export const ITEM_PRESETS: Record<
  ItemType,
  { title: string; months: number | null; km: number | null; productLabel: string }
> = {
  oil: { title: "Engine oil", months: 6, km: 5000, productLabel: "Oil type" },
  tire: { title: "Tires", months: 48, km: 40000, productLabel: "Tire type" },
  brakes: { title: "Brakes", months: 24, km: 30000, productLabel: "Pads / parts" },
  battery: { title: "Battery", months: 36, km: null, productLabel: "Battery model" },
  fluids: { title: "Fluids", months: 24, km: 40000, productLabel: "Fluid type" },
  inspection: { title: "Inspection", months: 12, km: null, productLabel: "Inspection type" },
  custom: { title: "Custom task", months: 12, km: null, productLabel: "Details" },
};
export const ITEM_TYPES = Object.keys(ITEM_PRESETS) as ItemType[];

export const DEFAULT_SETTINGS: Settings = {
  leadDays: 30,
  leadKm: 1000,
  inAppReminders: true,
  currency: "USD",
};

const KEY = "carcare-v2";
const OLD_KEY = "carcare-v1";
const empty: State = { vehicles: [], items: [], records: [], settings: DEFAULT_SETTINGS };
let state: State = empty;
let loaded = false;
const subs = new Set<() => void>();

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

/** Converts the v1 oil/tire-only shape into items + records. */
type V1 = {
  vehicles?: {
    id: string;
    type?: string;
    model?: string;
    plate?: string;
    mileage?: number;
    intervals?: Record<"oil" | "tire", { km: number; months: number }>;
  }[];
  records?: {
    id: string;
    vehicleId: string;
    kind: "oil" | "tire";
    date: string;
    mileage?: number;
    product?: string;
    notes?: string;
  }[];
};
function migrateV1(old: V1): State {
  const vehicles: Vehicle[] = [];
  const items: MaintenanceItem[] = [];
  const records: ServiceRecord[] = [];
  for (const v of old.vehicles ?? []) {
    const [make = "", ...rest] = String(v.model ?? "").split(" ");
    vehicles.push({
      id: v.id,
      type: v.type ?? "Sedan",
      make,
      model: rest.join(" ") || make,
      plate: v.plate || undefined,
      mileage: v.mileage ?? null,
      createdAt: now(),
    });
    for (const kind of ["oil", "tire"] as const) {
      const iv = v.intervals?.[kind] ?? {
        months: ITEM_PRESETS[kind].months,
        km: ITEM_PRESETS[kind].km,
      };
      const itemId = uid();
      items.push({
        id: itemId,
        vehicleId: v.id,
        type: kind,
        title: ITEM_PRESETS[kind].title,
        intervalMonths: iv.months,
        intervalKm: iv.km,
      });
      for (const r of (old.records ?? []).filter((r) => r.vehicleId === v.id && r.kind === kind))
        records.push({
          id: r.id,
          vehicleId: v.id,
          itemId,
          date: r.date,
          mileage: r.mileage ?? null,
          product: r.product || undefined,
          notes: r.notes,
          createdAt: now(),
        });
    }
  }
  return { vehicles, items, records, settings: DEFAULT_SETTINGS };
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      state = { ...empty, ...s, settings: { ...DEFAULT_SETTINGS, ...s.settings } };
      return;
    }
    const old = localStorage.getItem(OLD_KEY);
    if (old) set(migrateV1(JSON.parse(old)));
  } catch {
    // Corrupt or unreadable data: start empty rather than crash.
  }
}
function set(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked (private mode): keep working in memory.
  }
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

export type VehicleInput = Omit<Vehicle, "id" | "createdAt" | "archived">;
export type ItemInput = Omit<MaintenanceItem, "id">;
export type RecordInput = Omit<ServiceRecord, "id" | "createdAt">;

export const actions = {
  addVehicle(v: VehicleInput) {
    const id = uid();
    const defaults: MaintenanceItem[] = (["oil", "tire"] as const).map((type) => ({
      id: uid(),
      vehicleId: id,
      type,
      title: ITEM_PRESETS[type].title,
      intervalMonths: ITEM_PRESETS[type].months,
      intervalKm: ITEM_PRESETS[type].km,
    }));
    set({
      ...state,
      vehicles: [...state.vehicles, { ...v, id, createdAt: now() }],
      items: [...state.items, ...defaults],
    });
    return id;
  },
  updateVehicle(id: string, patch: Partial<Vehicle>) {
    set({ ...state, vehicles: state.vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v)) });
  },
  deleteVehicle(id: string) {
    set({
      ...state,
      vehicles: state.vehicles.filter((v) => v.id !== id),
      items: state.items.filter((i) => i.vehicleId !== id),
      records: state.records.filter((r) => r.vehicleId !== id),
    });
  },
  addItem(i: ItemInput) {
    set({ ...state, items: [...state.items, { ...i, id: uid() }] });
  },
  updateItem(id: string, patch: Partial<MaintenanceItem>) {
    set({ ...state, items: state.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  },
  deleteItem(id: string) {
    set({
      ...state,
      items: state.items.filter((i) => i.id !== id),
      records: state.records.filter((r) => r.itemId !== id),
    });
  },
  /** Appends a record (never replaces a prior one) and raises the odometer if the new reading is higher. */
  addRecord(r: RecordInput) {
    set({
      ...state,
      vehicles: bumpOdometer(state.vehicles, r),
      records: [...state.records, { ...r, id: uid(), createdAt: now() }],
    });
  },
  updateRecord(id: string, patch: RecordInput) {
    set({
      ...state,
      vehicles: bumpOdometer(state.vehicles, patch),
      records: state.records.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  },
  deleteRecord(id: string) {
    set({ ...state, records: state.records.filter((r) => r.id !== id) });
  },
  updateSettings(patch: Partial<Settings>) {
    set({ ...state, settings: { ...state.settings, ...patch } });
  },
};

function bumpOdometer(vehicles: Vehicle[], r: Pick<ServiceRecord, "vehicleId" | "mileage">) {
  return vehicles.map((v) =>
    v.id === r.vehicleId && r.mileage != null && (v.mileage == null || r.mileage > v.mileage)
      ? { ...v, mileage: r.mileage }
      : v,
  );
}

/** True when an identical record (same item, date and odometer) already exists. */
export function isDuplicate(
  records: ServiceRecord[],
  r: Pick<ServiceRecord, "itemId" | "date" | "mileage">,
  ignoreId?: string,
) {
  return records.some(
    (x) =>
      x.id !== ignoreId && x.itemId === r.itemId && x.date === r.date && x.mileage === r.mileage,
  );
}

// ---------- Due logic (PRD §5) ----------

/** "unknown" = only a mileage interval applies but the odometer reading is missing. */
export type DueStatus = "overdue" | "soon" | "ok" | "unknown" | "none";
export type Trigger = "date" | "mileage" | "both";
export type DueInfo = {
  item: MaintenanceItem;
  last?: ServiceRecord | undefined;
  nextDate?: string | undefined;
  nextMileage?: number | undefined;
  daysLeft?: number | undefined;
  kmLeft?: number | undefined;
  /** Mileage interval set, but current or last-service odometer is missing, so mileage status can't be judged. */
  mileageUnknown: boolean;
  status: DueStatus;
  trigger?: Trigger | undefined; // which threshold caused overdue/soon
};

export function addMonths(date: string, months: number) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}
export function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

export function lastRecord(records: ServiceRecord[], itemId: string) {
  return records
    .filter((r) => r.itemId === itemId)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.mileage ?? 0) - (a.mileage ?? 0))[0];
}

const rank: Record<DueStatus, number> = { none: 0, unknown: 0, ok: 1, soon: 2, overdue: 3 };

export function computeDue(
  v: Pick<Vehicle, "mileage">,
  item: MaintenanceItem,
  records: ServiceRecord[],
  settings: Pick<Settings, "leadDays" | "leadKm"> = DEFAULT_SETTINGS,
  now = today(),
): DueInfo {
  const last = lastRecord(records, item.id);
  const mileageUnknown =
    item.intervalKm != null && (v.mileage == null || (last != null && last.mileage == null));
  if (!last) return { item, status: "none", mileageUnknown };

  let dateStatus: DueStatus = "none";
  let nextDate: string | undefined, daysLeft: number | undefined;
  if (item.intervalMonths) {
    nextDate = addMonths(last.date, item.intervalMonths);
    daysLeft = daysBetween(now, nextDate);
    dateStatus = daysLeft < 0 ? "overdue" : daysLeft <= settings.leadDays ? "soon" : "ok";
  }

  let kmStatus: DueStatus = "none";
  let nextMileage: number | undefined, kmLeft: number | undefined;
  if (item.intervalKm && last.mileage != null) {
    nextMileage = last.mileage + item.intervalKm;
    if (v.mileage != null) {
      kmLeft = nextMileage - v.mileage;
      kmStatus = kmLeft <= 0 ? "overdue" : kmLeft <= settings.leadKm ? "soon" : "ok";
    }
  }

  const status = rank[dateStatus] >= rank[kmStatus] ? dateStatus : kmStatus;
  let trigger: Trigger | undefined;
  if (status === "overdue" || status === "soon") {
    const byDate = dateStatus === status;
    const byKm = kmStatus === status;
    trigger = byDate && byKm ? "both" : byDate ? "date" : "mileage";
  }
  return {
    item,
    last,
    nextDate,
    nextMileage,
    daysLeft,
    kmLeft,
    mileageUnknown,
    status: status === "none" ? (mileageUnknown ? "unknown" : "ok") : status,
    trigger,
  };
}

/** Plain-language reason for a status, so it never depends on color alone. */
export function dueReason(d: DueInfo) {
  if (d.status === "none") return "No service logged yet";
  if (d.status === "unknown") return "Update the odometer to check mileage status";
  const parts: string[] = [];
  if (d.daysLeft != null)
    parts.push(d.daysLeft < 0 ? `${-d.daysLeft} days past due date` : `${d.daysLeft} days left`);
  if (d.kmLeft != null)
    parts.push(d.kmLeft <= 0 ? `${fmtKm(-d.kmLeft)} past due mileage` : `${fmtKm(d.kmLeft)} left`);
  const basis = d.trigger === "both" ? "date and mileage" : d.trigger;
  const prefix =
    d.status === "overdue"
      ? `Overdue by ${basis}`
      : d.status === "soon"
        ? `Due soon by ${basis}`
        : "";
  return [prefix, parts.join(" · ")].filter(Boolean).join(" — ");
}

export function vehicleName(v: Pick<Vehicle, "make" | "model" | "nickname">) {
  return v.nickname || `${v.make} ${v.model}`.trim();
}

export const fmtDate = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const fmtKm = (n: number) => `${n.toLocaleString()} km`;
export const fmtMoney = (n: number, currency: string) => {
  try {
    return n.toLocaleString(undefined, { style: "currency", currency });
  } catch {
    return `${n.toLocaleString()} ${currency}`;
  }
};

export function intervalText(i: Pick<MaintenanceItem, "intervalMonths" | "intervalKm">) {
  const parts = [
    i.intervalMonths ? `${i.intervalMonths} mo` : "",
    i.intervalKm ? fmtKm(i.intervalKm) : "",
  ].filter(Boolean);
  return parts.length ? `Every ${parts.join(" or ")}` : "No interval set";
}

export function toCsv(s: State) {
  const esc = (x: unknown) => {
    const t = x == null ? "" : String(x);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const rows = [
    [
      "Vehicle",
      "Plate",
      "Item",
      "Date",
      "Odometer (km)",
      "Product",
      "Cost",
      "Currency",
      "Provider",
      "Notes",
    ],
  ];
  for (const r of [...s.records].sort((a, b) => b.date.localeCompare(a.date))) {
    const v = s.vehicles.find((x) => x.id === r.vehicleId);
    const i = s.items.find((x) => x.id === r.itemId);
    rows.push(
      [
        v ? vehicleName(v) : "",
        v?.plate ?? "",
        i?.title ?? "",
        r.date,
        r.mileage ?? "",
        r.product ?? "",
        r.cost ?? "",
        r.cost != null ? s.settings.currency : "",
        r.provider ?? "",
        r.notes ?? "",
      ].map(String),
    );
  }
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}
