import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, Settings2 } from "lucide-react";
import { actions, computeDue, useStore, KIND_LABEL, fmtDate, fmtKm, today, type ServiceKind, type Vehicle } from "@/lib/store";
import { Shell, Field, btn, btnGhost, StatusPill, KindIcon, DueLine } from "@/components/ui-kit";

export const Route = createFileRoute("/vehicle/$id")({
  head: () => ({
    meta: [
      { title: "Vehicle maintenance — Oil & Tire Tracker" },
      { name: "description", content: "Record oil and tire changes and see when the next service is due." },
      { property: "og:title", content: "Vehicle maintenance — Oil & Tire Tracker" },
      { property: "og:description", content: "Record oil and tire changes and see when the next service is due." },
    ],
  }),
  component: VehiclePage,
});

function VehiclePage() {
  const { id } = Route.useParams();
  const { vehicles, records } = useStore();
  const nav = useNavigate();
  const v = vehicles.find((x) => x.id === id);
  const [form, setForm] = useState<ServiceKind | null>(null);
  const [settings, setSettings] = useState(false);
  const [filter, setFilter] = useState<"all" | ServiceKind>("all");

  if (!v) return <Shell title="Vehicle" back><p className="text-muted-foreground">Vehicle not found.</p></Shell>;
  const history = records
    .filter((r) => r.vehicleId === v.id && (filter === "all" || r.kind === filter))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Shell title={v.model} back action={<button aria-label="Settings" onClick={() => setSettings(!settings)} className="p-2 text-muted-foreground"><Settings2 className="h-5 w-5" /></button>}>
      <div className="flex items-center justify-between">
        <span className="rounded bg-plate px-2 py-0.5 font-mono font-bold text-plate-foreground">{v.plate}</span>
        <span className="text-sm text-muted-foreground">{v.type}</span>
      </div>

      <MileageUpdate v={v} />

      {settings && <Intervals v={v} onDelete={() => { if (confirm("Delete this vehicle and all its records?")) { actions.deleteVehicle(v.id); nav({ to: "/" }); } }} />}

      <div className="grid grid-cols-2 gap-3">
        {(["oil", "tire"] as const).map((k) => {
          const d = computeDue(v, records, k);
          return (
            <div key={k} className="space-y-2 rounded-2xl border bg-card p-4 shadow-card">
              <div className="flex items-center gap-1.5 font-semibold"><KindIcon kind={k} /> {KIND_LABEL[k]}</div>
              <StatusPill status={d.status} />
              <DueLine d={d} />
              <button className={`${btn} w-full text-sm`} onClick={() => setForm(k)}>+ Record</button>
            </div>
          );
        })}
      </div>

      {form && <RecordForm v={v} kind={form} onDone={() => setForm(null)} />}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">History</h2>
          <div className="flex gap-1 rounded-lg bg-muted p-1 text-xs">
            {(["all", "oil", "tire"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-2.5 py-1 ${filter === f ? "bg-card font-semibold shadow-card" : "text-muted-foreground"}`}>
                {f === "all" ? "All" : KIND_LABEL[f]}
              </button>
            ))}
          </div>
        </div>
        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No records yet.</p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card">
            {history.map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-4">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${r.kind === "oil" ? "bg-primary/15 text-primary" : "bg-secondary text-secondary-foreground"}`}><KindIcon kind={r.kind} /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.product || KIND_LABEL[r.kind]}</p>
                  <p className="text-sm text-muted-foreground">{fmtDate(r.date)} · {fmtKm(r.mileage)}</p>
                  {r.notes && <p className="truncate text-sm text-muted-foreground">{r.notes}</p>}
                </div>
                <button aria-label="Delete record" className="p-2 text-muted-foreground" onClick={() => confirm("Delete this record?") && actions.deleteRecord(r.id)}><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Shell>
  );
}

function MileageUpdate({ v }: { v: Vehicle }) {
  const [km, setKm] = useState("");
  return (
    <form className="flex items-end gap-2 rounded-2xl border bg-card p-4" onSubmit={(e) => { e.preventDefault(); if (km) { actions.updateVehicle(v.id, { mileage: Number(km) }); setKm(""); } }}>
      <div className="flex-1"><Field label={`Odometer · now ${fmtKm(v.mileage)}`} type="number" inputMode="numeric" placeholder="Update mileage" value={km} onChange={(e) => setKm(e.target.value)} /></div>
      <button className={btnGhost}>Update</button>
    </form>
  );
}

function RecordForm({ v, kind, onDone }: { v: Vehicle; kind: ServiceKind; onDone: () => void }) {
  const [f, setF] = useState({ date: today(), mileage: String(v.mileage), product: "", notes: "" });
  return (
    <form className="space-y-3 rounded-2xl border-2 border-primary bg-card p-5" onSubmit={(e) => { e.preventDefault(); actions.addRecord({ vehicleId: v.id, kind, date: f.date, mileage: Number(f.mileage), product: f.product.trim(), notes: f.notes.trim() || undefined }); onDone(); }}>
      <h3 className="flex items-center gap-2 font-display text-lg font-bold"><KindIcon kind={kind} /> Record {KIND_LABEL[kind].toLowerCase()} change</h3>
      <Field label="Replacement date" type="date" value={f.date} max={today()} onChange={(e) => setF({ ...f, date: e.target.value })} required />
      <Field label="Mileage at service (km)" type="number" inputMode="numeric" value={f.mileage} onChange={(e) => setF({ ...f, mileage: e.target.value })} required />
      <Field label={kind === "oil" ? "Oil type" : "Tire type"} placeholder={kind === "oil" ? "5W-30 fully synthetic" : "Michelin Primacy 4, 205/55 R16"} value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })} />
      <Field label="Notes (optional)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      <div className="flex gap-2"><button className={`${btn} flex-1`}>Save record</button><button type="button" className={btnGhost} onClick={onDone}>Cancel</button></div>
    </form>
  );
}

function Intervals({ v, onDelete }: { v: Vehicle; onDelete: () => void }) {
  const set = (k: ServiceKind, key: "km" | "months", val: string) =>
    actions.updateVehicle(v.id, { intervals: { ...v.intervals, [k]: { ...v.intervals[k], [key]: Math.max(1, Number(val) || 1) } } });
  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5">
      <h3 className="font-display text-lg font-bold">Service intervals</h3>
      <p className="text-sm text-muted-foreground">Next service is due at whichever comes first.</p>
      {(["oil", "tire"] as const).map((k) => (
        <div key={k}>
          <p className="mb-2 flex items-center gap-1.5 font-semibold"><KindIcon kind={k} /> {KIND_LABEL[k]}</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Every km" type="number" value={v.intervals[k].km} onChange={(e) => set(k, "km", e.target.value)} />
            <Field label="Every months" type="number" value={v.intervals[k].months} onChange={(e) => set(k, "months", e.target.value)} />
          </div>
        </div>
      ))}
      <button className="flex items-center gap-2 text-sm font-medium text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /> Delete vehicle</button>
    </div>
  );
}
