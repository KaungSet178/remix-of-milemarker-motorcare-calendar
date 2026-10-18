import { useState, type FormEvent } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  actions,
  isDuplicate,
  today,
  useStore,
  ITEM_PRESETS,
  ITEM_TYPES,
  VEHICLE_TYPES,
  type ItemType,
  type MaintenanceItem,
  type ServiceRecord,
  type Vehicle,
  type VehicleInput,
} from "@/lib/store";
import {
  Field,
  SelectField,
  TextArea,
  btn,
  btnGhost,
  ItemIcon,
  ConfirmDialog,
} from "@/components/ui-kit";

type Errors = Partial<
  Record<
    "make" | "model" | "mileage" | "year" | "date" | "cost" | "title" | "months" | "km",
    string
  >
>;

/** "" → null; otherwise a non-negative number or NaN (invalid). */
function parseNum(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

// ---------- Vehicle ----------

export function VehicleForm({
  vehicle,
  first,
  onDone,
}: {
  vehicle?: Vehicle;
  first?: boolean;
  onDone: (id?: string) => void;
}) {
  const [f, setF] = useState({
    type: vehicle?.type ?? "Sedan",
    make: vehicle?.make ?? "",
    model: vehicle?.model ?? "",
    mileage: vehicle?.mileage != null ? String(vehicle.mileage) : "",
    year: vehicle?.year ? String(vehicle.year) : "",
    nickname: vehicle?.nickname ?? "",
    plate: vehicle?.plate ?? "",
    notes: vehicle?.notes ?? "",
  });
  const [more, setMore] = useState(
    !!vehicle && !!(vehicle.year || vehicle.nickname || vehicle.plate || vehicle.notes),
  );
  const [err, setErr] = useState<Errors>({});
  const up = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errors: Errors = {};
    if (!f.make.trim()) errors.make = "Enter the make, e.g. Toyota";
    if (!f.model.trim()) errors.model = "Enter the model, e.g. Vios";
    const mileage = parseNum(f.mileage);
    if (Number.isNaN(mileage)) errors.mileage = "Mileage must be a number of 0 or more";
    const year = parseNum(f.year);
    const maxYear = new Date().getFullYear() + 1;
    if (
      year != null &&
      (Number.isNaN(year) || year < 1900 || year > maxYear || !Number.isInteger(year))
    )
      errors.year = `Enter a year between 1900 and ${maxYear}`;
    setErr(errors);
    if (Object.keys(errors).length) {
      if (errors.year) setMore(true);
      return;
    }
    const data: VehicleInput = {
      type: f.type,
      make: f.make.trim(),
      model: f.model.trim(),
      mileage,
      year: year ?? undefined,
      nickname: f.nickname.trim() || undefined,
      plate: f.plate.trim().toUpperCase() || undefined,
      notes: f.notes.trim() || undefined,
    };
    if (vehicle) {
      actions.updateVehicle(vehicle.id, data);
      toast.success("Vehicle updated");
      onDone(vehicle.id);
    } else {
      const id = actions.addVehicle(data);
      toast.success(`${data.make} ${data.model} added — engine oil and tires are ready to track`);
      onDone(id);
    }
  };

  return (
    <form
      noValidate
      className="space-y-3 rounded-2xl border bg-card p-5 shadow-card"
      onSubmit={submit}
    >
      <h2 className="font-display text-lg font-bold">
        {vehicle ? "Edit vehicle" : first ? "Add your first vehicle" : "New vehicle"}
      </h2>
      {first && (
        <p className="text-sm text-muted-foreground">
          Save your vehicle, then log its last oil change and tire replacement.
        </p>
      )}
      <SelectField label="Vehicle type" value={f.type} onChange={up("type")}>
        {VEHICLE_TYPES.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </SelectField>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Make"
          placeholder="Toyota"
          value={f.make}
          onChange={up("make")}
          error={err.make}
        />
        <Field
          label="Model"
          placeholder="Vios"
          value={f.model}
          onChange={up("model")}
          error={err.model}
        />
      </div>
      <Field
        label="Current mileage (km)"
        type="number"
        inputMode="numeric"
        min={0}
        value={f.mileage}
        onChange={up("mileage")}
        error={err.mileage}
        hint="Optional, but needed for mileage-based reminders"
      />
      <button
        type="button"
        className="flex items-center gap-1 text-sm font-medium text-primary"
        aria-expanded={more}
        onClick={() => setMore(!more)}
      >
        <ChevronDown className={`h-4 w-4 transition ${more ? "rotate-180" : ""}`} /> More details
        (optional)
      </button>
      {more && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Year"
              type="number"
              inputMode="numeric"
              placeholder="2020"
              value={f.year}
              onChange={up("year")}
              error={err.year}
            />
            <Field
              label="Nickname"
              placeholder="Family car"
              value={f.nickname}
              onChange={up("nickname")}
            />
          </div>
          <Field
            label="Plate / registration"
            placeholder="YGN 1A-2345"
            value={f.plate}
            onChange={up("plate")}
            hint="Only used to tell your vehicles apart"
          />
          <TextArea label="Notes" value={f.notes} onChange={up("notes")} />
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button className={`${btn} flex-1`}>Save vehicle</button>
        {!first && (
          <button type="button" className={btnGhost} onClick={() => onDone()}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// ---------- Service record ----------

export function RecordDialog({
  vehicle,
  item,
  record,
  open,
  onOpenChange,
}: {
  vehicle: Vehicle;
  item: MaintenanceItem;
  record?: ServiceRecord | undefined;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-md">
        {open && (
          <RecordFormBody
            vehicle={vehicle}
            item={item}
            record={record}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RecordFormBody({
  vehicle,
  item,
  record,
  onDone,
}: {
  vehicle: Vehicle;
  item: MaintenanceItem;
  record?: ServiceRecord | undefined;
  onDone: () => void;
}) {
  const { records, settings } = useStore();
  const [f, setF] = useState({
    date: record?.date ?? today(),
    mileage: record
      ? record.mileage != null
        ? String(record.mileage)
        : ""
      : vehicle.mileage != null
        ? String(vehicle.mileage)
        : "",
    product: record?.product ?? "",
    cost: record?.cost != null ? String(record.cost) : "",
    provider: record?.provider ?? "",
    notes: record?.notes ?? "",
  });
  const [err, setErr] = useState<Errors>({});
  const up = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });
  const preset = ITEM_PRESETS[item.type];
  const isTire = item.type === "tire";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errors: Errors = {};
    if (!f.date) errors.date = "Service date is required";
    else if (f.date > today()) errors.date = "Service date can't be in the future";
    const mileage = parseNum(f.mileage);
    if (Number.isNaN(mileage)) errors.mileage = "Odometer must be a number of 0 or more";
    const cost = parseNum(f.cost);
    if (Number.isNaN(cost)) errors.cost = "Cost must be a number of 0 or more";
    if (
      !errors.date &&
      !errors.mileage &&
      isDuplicate(records, { itemId: item.id, date: f.date, mileage }, record?.id)
    )
      errors.date = "This service is already logged for that date and odometer";
    setErr(errors);
    if (Object.keys(errors).length) return;
    const data = {
      vehicleId: vehicle.id,
      itemId: item.id,
      date: f.date,
      mileage,
      product: f.product.trim() || undefined,
      cost: cost ?? undefined,
      provider: f.provider.trim() || undefined,
      notes: f.notes.trim() || undefined,
    };
    if (record) {
      actions.updateRecord(record.id, data);
      toast.success("Record updated");
    } else {
      actions.addRecord(data);
      toast.success(`${item.title} recorded — next due date recalculated`);
    }
    onDone();
  };

  return (
    <form noValidate onSubmit={submit} className="space-y-3">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 font-display text-xl">
          <ItemIcon type={item.type} className="h-5 w-5" /> {record ? "Edit" : "Record"}{" "}
          {item.title.toLowerCase()}
        </DialogTitle>
        <DialogDescription>
          {vehicle.make} {vehicle.model}
          {vehicle.plate ? ` · ${vehicle.plate}` : ""}
        </DialogDescription>
      </DialogHeader>
      <Field
        label={isTire || item.type === "battery" ? "Replacement date" : "Service date"}
        type="date"
        max={today()}
        value={f.date}
        onChange={up("date")}
        error={err.date}
      />
      <Field
        label="Current mileage (km)"
        type="number"
        inputMode="numeric"
        min={0}
        value={f.mileage}
        onChange={up("mileage")}
        error={err.mileage}
        hint="Raises the vehicle odometer if higher"
      />
      <Field
        label={preset.productLabel}
        placeholder={
          item.type === "oil"
            ? "5W-30 fully synthetic"
            : isTire
              ? "Michelin Primacy 4, 205/55 R16"
              : ""
        }
        value={f.product}
        onChange={up("product")}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label={`Cost (${settings.currency}, optional)`}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={f.cost}
          onChange={up("cost")}
          error={err.cost}
        />
        <Field
          label="Provider (optional)"
          placeholder="Shop name"
          value={f.provider}
          onChange={up("provider")}
        />
      </div>
      <TextArea label="Notes (optional)" value={f.notes} onChange={up("notes")} />
      <div className="flex gap-2 pt-1">
        <button className={`${btn} flex-1`}>Save record</button>
        <button type="button" className={btnGhost} onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------- Maintenance item / interval ----------

export function ItemDialog({
  vehicleId,
  item,
  open,
  onOpenChange,
}: {
  vehicleId: string;
  item?: MaintenanceItem | undefined;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-md">
        {open && (
          <ItemFormBody vehicleId={vehicleId} item={item} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ItemFormBody({
  vehicleId,
  item,
  onDone,
}: {
  vehicleId: string;
  item?: MaintenanceItem | undefined;
  onDone: () => void;
}) {
  const { records } = useStore();
  const [type, setType] = useState<ItemType>(item?.type ?? "brakes");
  const [f, setF] = useState({
    title: item?.title ?? ITEM_PRESETS.brakes.title,
    months: item
      ? item.intervalMonths != null
        ? String(item.intervalMonths)
        : ""
      : String(ITEM_PRESETS.brakes.months ?? ""),
    km: item
      ? item.intervalKm != null
        ? String(item.intervalKm)
        : ""
      : String(ITEM_PRESETS.brakes.km ?? ""),
  });
  const [err, setErr] = useState<Errors>({});
  const [confirm, setConfirm] = useState(false);
  const count = item ? records.filter((r) => r.itemId === item.id).length : 0;

  const pickType = (t: ItemType) => {
    setType(t);
    const p = ITEM_PRESETS[t];
    setF({
      title: t === "custom" ? "" : p.title,
      months: p.months != null ? String(p.months) : "",
      km: p.km != null ? String(p.km) : "",
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errors: Errors = {};
    if (!f.title.trim()) errors.title = "Give this task a name";
    const months = parseNum(f.months);
    const km = parseNum(f.km);
    if (Number.isNaN(months) || months === 0)
      errors.months = "Use a whole number of months above 0";
    if (Number.isNaN(km) || km === 0) errors.km = "Use a distance above 0";
    if (!errors.months && !errors.km && months == null && km == null)
      errors.months = "Set a time interval, a distance interval, or both";
    setErr(errors);
    if (Object.keys(errors).length) return;
    const data = {
      title: f.title.trim(),
      intervalMonths: months != null ? Math.round(months) : null,
      intervalKm: km,
    };
    if (item) {
      actions.updateItem(item.id, data);
      toast.success("Schedule updated");
    } else {
      actions.addItem({ vehicleId, type, ...data });
      toast.success(`${data.title} added`);
    }
    onDone();
  };

  return (
    <form noValidate onSubmit={submit} className="space-y-3">
      <DialogHeader>
        <DialogTitle className="font-display text-xl">
          {item ? `${item.title} schedule` : "Add maintenance item"}
        </DialogTitle>
        <DialogDescription>
          Due when either threshold is reached. These are suggestions — follow your vehicle manual
          or a qualified mechanic.
        </DialogDescription>
      </DialogHeader>
      {!item && (
        <SelectField
          label="Type"
          value={type}
          onChange={(e) => pickType(e.target.value as ItemType)}
        >
          {[
            ...ITEM_TYPES.filter((t) => t !== "oil" && t !== "tire"),
            "oil" as const,
            "tire" as const,
          ].map((t) => (
            <option key={t} value={t}>
              {ITEM_PRESETS[t].title}
            </option>
          ))}
        </SelectField>
      )}
      <Field
        label="Name"
        value={f.title}
        onChange={(e) => setF({ ...f, title: e.target.value })}
        error={err.title}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Every (months)"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="—"
          value={f.months}
          onChange={(e) => setF({ ...f, months: e.target.value })}
          error={err.months}
        />
        <Field
          label="Every (km)"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="—"
          value={f.km}
          onChange={(e) => setF({ ...f, km: e.target.value })}
          error={err.km}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Leave one blank to track by time only or mileage only.
      </p>
      <div className="flex gap-2 pt-1">
        <button className={`${btn} flex-1`}>{item ? "Save schedule" : "Add item"}</button>
        <button type="button" className={btnGhost} onClick={onDone}>
          Cancel
        </button>
      </div>
      {item && (
        <>
          <button
            type="button"
            className="text-sm font-medium text-destructive"
            onClick={() => setConfirm(true)}
          >
            Remove this item
          </button>
          <ConfirmDialog
            open={confirm}
            onOpenChange={setConfirm}
            title={`Remove ${item.title}?`}
            description={`This stops tracking ${item.title.toLowerCase()} and permanently deletes its ${count} service record${count === 1 ? "" : "s"}.`}
            confirmLabel="Remove"
            onConfirm={() => {
              actions.deleteItem(item.id);
              toast.success(`${item.title} removed`);
              onDone();
            }}
          />
        </>
      )}
    </form>
  );
}
