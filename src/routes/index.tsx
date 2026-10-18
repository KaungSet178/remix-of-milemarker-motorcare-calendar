import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, AlertTriangle, ChevronDown, Pencil, ArchiveRestore } from "lucide-react";
import {
  actions,
  computeDue,
  useStore,
  fmtKm,
  intervalText,
  vehicleName,
  type MaintenanceItem,
  type Vehicle,
} from "@/lib/store";
import {
  Shell,
  btn,
  btnSmall,
  StatusPill,
  ItemIcon,
  DueLine,
  EmptyState,
} from "@/components/ui-kit";
import { VehicleForm, ItemDialog } from "@/components/forms";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My Vehicles — Vehicle Maintenance Tracker" },
      {
        name: "description",
        content: "Track maintenance, service history and upcoming tasks for every vehicle you own.",
      },
      { property: "og:title", content: "My Vehicles — Vehicle Maintenance Tracker" },
      {
        property: "og:description",
        content: "Track maintenance, service history and upcoming tasks for every vehicle you own.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { vehicles, items, records, settings } = useStore();
  const nav = useNavigate();
  const [adding, setAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const active = vehicles.filter((v) => !v.archived);
  const archived = vehicles.filter((v) => v.archived);

  const alerts = settings.inAppReminders
    ? active.flatMap((v) =>
        items
          .filter((i) => i.vehicleId === v.id)
          .map((i) => ({ v, d: computeDue(v, i, records, settings) }))
          .filter((x) => x.d.status === "overdue" || x.d.status === "soon"),
      )
    : [];

  return (
    <Shell
      title="My Vehicles"
      action={
        active.length > 0 &&
        !adding && (
          <button className={btn} onClick={() => setAdding(true)} aria-label="Add vehicle">
            <Plus className="h-4 w-4" /> Add
          </button>
        )
      }
    >
      {alerts.length > 0 && (
        <section className="space-y-2" aria-label="Reminders">
          {alerts.map(({ v, d }) => (
            <Link
              key={d.item.id}
              to="/vehicle/$id"
              params={{ id: v.id }}
              className={`flex items-center gap-3 rounded-xl p-3 text-sm ${d.status === "overdue" ? "bg-destructive/10" : "bg-warning/20"}`}
            >
              <AlertTriangle
                className={`h-5 w-5 shrink-0 ${d.status === "overdue" ? "text-destructive" : "text-warning-foreground"}`}
                aria-hidden
              />
              <span>
                <b>{d.item.title}</b> for {vehicleName(v)} is{" "}
                {d.status === "overdue" ? "overdue" : "due soon"}
                {d.trigger && ` (by ${d.trigger === "both" ? "date and mileage" : d.trigger})`}
              </span>
            </Link>
          ))}
        </section>
      )}

      {(adding || active.length === 0) && (
        <VehicleForm
          first={active.length === 0}
          onDone={(id) => {
            setAdding(false);
            if (id) nav({ to: "/vehicle/$id", params: { id } });
          }}
        />
      )}

      {active.map((v) => (
        <VehicleCard key={v.id} v={v} items={items.filter((i) => i.vehicleId === v.id)} />
      ))}

      {archived.length > 0 && (
        <section>
          <button
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground"
            aria-expanded={showArchived}
            onClick={() => setShowArchived(!showArchived)}
          >
            <ChevronDown className={`h-4 w-4 transition ${showArchived ? "rotate-180" : ""}`} />{" "}
            Archived vehicles ({archived.length})
          </button>
          {showArchived && (
            <ul className="mt-2 divide-y rounded-2xl border bg-card">
              {archived.map((v) => (
                <li key={v.id} className="flex items-center gap-3 p-4">
                  <Link to="/vehicle/$id" params={{ id: v.id }} className="min-w-0 flex-1">
                    <p className="font-semibold">{vehicleName(v)}</p>
                    <p className="text-sm text-muted-foreground">{v.type}</p>
                  </Link>
                  <button
                    className={btnSmall}
                    onClick={() => {
                      actions.updateVehicle(v.id, { archived: false });
                      toast.success(`${vehicleName(v)} restored`);
                    }}
                  >
                    <ArchiveRestore className="h-4 w-4" /> Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </Shell>
  );
}

function VehicleCard({ v, items }: { v: Vehicle; items: MaintenanceItem[] }) {
  const { records, settings } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceItem | "new" | null>(null);

  return (
    <article className="rounded-2xl border bg-card p-5 shadow-card">
      <Link
        to="/vehicle/$id"
        params={{ id: v.id }}
        className="flex items-start justify-between gap-3"
      >
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{v.type}</p>
          <h2 className="truncate font-display text-xl font-bold">
            {v.make} {v.model}
            {v.year ? <span className="font-normal text-muted-foreground"> {v.year}</span> : null}
          </h2>
          {v.nickname && <p className="text-sm text-muted-foreground">{v.nickname}</p>}
          {v.plate && (
            <p className="mt-1 inline-block rounded bg-plate px-2 py-0.5 font-mono text-sm font-bold text-plate-foreground">
              {v.plate}
            </p>
          )}
        </div>
        <p className="shrink-0 text-right text-sm text-muted-foreground">
          Odometer
          <br />
          <b className="text-foreground">{v.mileage != null ? fmtKm(v.mileage) : "Not set"}</b>
        </p>
      </Link>

      <div className="mt-4 grid gap-3">
        {items.length === 0 && (
          <EmptyState>No maintenance items. Add one under Service intervals.</EmptyState>
        )}
        {items.map((i) => {
          const d = computeDue(v, i, records, settings);
          return (
            <Link
              key={i.id}
              to="/vehicle/$id"
              params={{ id: v.id }}
              className="block rounded-xl border bg-background p-3"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-semibold">
                  <ItemIcon type={i.type} /> {i.title}
                </span>
                <StatusPill status={d.status} />
              </div>
              <DueLine d={d} compact />
            </Link>
          );
        })}
      </div>

      <div className="mt-4 border-t pt-3">
        <button
          className="flex w-full items-center justify-between text-sm font-semibold"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          Service intervals
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <ul className="mt-3 space-y-2">
            {items.map((i) => (
              <li
                key={i.id}
                className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
              >
                <ItemIcon type={i.type} />
                <span className="flex-1">
                  <b>{i.title}</b> · {intervalText(i)}
                </span>
                <button
                  className="p-1 text-muted-foreground"
                  aria-label={`Edit ${i.title} interval`}
                  onClick={() => setEditing(i)}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </li>
            ))}
            <li>
              <button className={`${btnSmall} w-full py-2`} onClick={() => setEditing("new")}>
                <Plus className="h-4 w-4" /> Add maintenance item
              </button>
            </li>
          </ul>
        )}
      </div>
      <ItemDialog
        vehicleId={v.id}
        item={editing === "new" ? undefined : (editing ?? undefined)}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </article>
  );
}
