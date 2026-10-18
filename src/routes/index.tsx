import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { actions, computeDue, useStore, KIND_LABEL, fmtKm } from "@/lib/store";
import { Shell, Field, btn, btnGhost, StatusPill, KindIcon, DueLine } from "@/components/ui-kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My Vehicles — Oil & Tire Tracker" },
      { name: "description", content: "Track engine oil and tire changes for every car you own." },
      { property: "og:title", content: "My Vehicles — Oil & Tire Tracker" },
      { property: "og:description", content: "Track engine oil and tire changes for every car you own." },
    ],
  }),
  component: Index,
});

function Index() {
  const { vehicles, records } = useStore();
  const [adding, setAdding] = useState(false);
  const alerts = vehicles.flatMap((v) =>
    (["oil", "tire"] as const).map((k) => ({ v, d: computeDue(v, records, k) })).filter((x) => x.d.status === "overdue" || x.d.status === "soon"),
  );

  return (
    <Shell
      title="My vehicles"
      action={
        vehicles.length > 0 && !adding && (
          <button className={btn} onClick={() => setAdding(true)} aria-label="Add vehicle">
            <Plus className="h-4 w-4" /> Add
          </button>
        )
      }
    >
      {alerts.length > 0 && (
        <section className="space-y-2">
          {alerts.map(({ v, d }) => (
            <Link key={v.id + d.kind} to="/vehicle/$id" params={{ id: v.id }} className={`flex items-center gap-3 rounded-xl p-3 text-sm ${d.status === "overdue" ? "bg-destructive/10" : "bg-warning/20"}`}>
              <AlertTriangle className={`h-5 w-5 shrink-0 ${d.status === "overdue" ? "text-destructive" : "text-warning-foreground"}`} />
              <span>
                <b>{KIND_LABEL[d.kind]}</b> for {v.model} ({v.plate}) is {d.status === "overdue" ? "overdue" : "due soon"}
              </span>
            </Link>
          ))}
        </section>
      )}

      {(adding || vehicles.length === 0) && <AddVehicle onDone={() => setAdding(false)} first={vehicles.length === 0} />}

      {vehicles.map((v) => (
        <Link key={v.id} to="/vehicle/$id" params={{ id: v.id }} className="block rounded-2xl border bg-card p-5 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{v.type}</p>
              <h2 className="font-display text-xl font-bold">{v.model}</h2>
              <p className="mt-1 inline-block rounded bg-plate px-2 py-0.5 font-mono text-sm font-bold text-plate-foreground">{v.plate}</p>
            </div>
            <p className="text-right text-sm text-muted-foreground">
              Odometer
              <br />
              <b className="text-foreground">{fmtKm(v.mileage)}</b>
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            {(["oil", "tire"] as const).map((k) => {
              const d = computeDue(v, records, k);
              return (
                <div key={k} className="rounded-xl bg-muted p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <KindIcon kind={k} /> {KIND_LABEL[k]}
                    </span>
                    <StatusPill status={d.status} />
                  </div>
                  <DueLine d={d} />
                </div>
              );
            })}
          </div>
        </Link>
      ))}
    </Shell>
  );
}

function AddVehicle({ onDone, first }: { onDone: () => void; first: boolean }) {
  const [f, setF] = useState({ type: "Sedan", model: "", plate: "", mileage: "" });
  return (
    <form
      className="space-y-3 rounded-2xl border bg-card p-5 shadow-card"
      onSubmit={(e) => {
        e.preventDefault();
        actions.addVehicle({ type: f.type, model: f.model.trim(), plate: f.plate.trim().toUpperCase(), mileage: Number(f.mileage) || 0 });
        setF({ type: "Sedan", model: "", plate: "", mileage: "" });
        onDone();
      }}
    >
      <h2 className="font-display text-lg font-bold">{first ? "Add your first vehicle" : "New vehicle"}</h2>
      {first && <p className="text-sm text-muted-foreground">Never forget an oil change or tire swap again.</p>}
      <Field label="Vehicle type" list="types" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} required />
      <datalist id="types">
        {["Sedan", "Hatchback", "SUV", "Pickup", "Van", "Motorcycle"].map((t) => <option key={t} value={t} />)}
      </datalist>
      <Field label="Model" placeholder="Toyota Vios 2020" value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} required />
      <Field label="Plate number" placeholder="YGN 1A-2345" value={f.plate} onChange={(e) => setF({ ...f, plate: e.target.value })} required />
      <Field label="Current mileage (km)" type="number" inputMode="numeric" min={0} value={f.mileage} onChange={(e) => setF({ ...f, mileage: e.target.value })} required />
      <div className="flex gap-2">
        <button className={`${btn} flex-1`}>Save vehicle</button>
        {!first && <button type="button" className={btnGhost} onClick={onDone}>Cancel</button>}
      </div>
    </form>
  );
}
