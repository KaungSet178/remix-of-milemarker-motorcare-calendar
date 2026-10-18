import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  MoreVertical,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Settings2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  actions,
  computeDue,
  useStore,
  fmtKm,
  vehicleName,
  type MaintenanceItem,
  type Vehicle,
} from "@/lib/store";
import {
  Shell,
  Field,
  btn,
  btnGhost,
  StatusPill,
  ItemIcon,
  DueLine,
  ConfirmDialog,
} from "@/components/ui-kit";
import { VehicleForm, RecordDialog, ItemDialog } from "@/components/forms";
import { HistoryList } from "@/components/history";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/vehicle/$id")({
  head: () => ({
    meta: [
      { title: "Vehicle maintenance — Vehicle Maintenance Tracker" },
      {
        name: "description",
        content: "Log completed services and see when the next maintenance is due.",
      },
      { property: "og:title", content: "Vehicle maintenance — Vehicle Maintenance Tracker" },
      {
        property: "og:description",
        content: "Log completed services and see when the next maintenance is due.",
      },
    ],
  }),
  component: VehiclePage,
});

function VehiclePage() {
  const { id } = Route.useParams();
  const { vehicles, items, records, settings } = useStore();
  const nav = useNavigate();
  const v = vehicles.find((x) => x.id === id);
  const [recording, setRecording] = useState<MaintenanceItem | null>(null);
  const [itemEdit, setItemEdit] = useState<MaintenanceItem | "new" | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  if (!v)
    return (
      <Shell title="Vehicle" back>
        <p className="text-muted-foreground">Vehicle not found.</p>
      </Shell>
    );

  const vItems = items.filter((i) => i.vehicleId === v.id);
  const vRecords = records.filter((r) => r.vehicleId === v.id);
  const history = vRecords.filter((r) => filter === "all" || r.itemId === filter);
  const name = vehicleName(v);

  return (
    <Shell
      title={name}
      back
      action={
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Vehicle options"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            <MoreVertical className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Edit vehicle
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                actions.updateVehicle(v.id, { archived: !v.archived });
                toast.success(
                  v.archived
                    ? `${name} restored`
                    : `${name} archived — reminders paused, history kept`,
                );
                if (!v.archived) nav({ to: "/" });
              }}
            >
              {v.archived ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}{" "}
              {v.archived ? "Restore" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" /> Delete vehicle
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      {v.archived && (
        <p className="rounded-xl bg-muted p-3 text-sm">
          This vehicle is archived. Reminders are paused; restore it from the menu.
        </p>
      )}

      {editing ? (
        <VehicleForm vehicle={v} onDone={() => setEditing(false)} />
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{v.type}</span>
          {v.year && <span>· {v.year}</span>}
          {v.nickname && (
            <span>
              · {v.make} {v.model}
            </span>
          )}
          {v.plate && (
            <span className="rounded bg-plate px-2 py-0.5 font-mono font-bold text-plate-foreground">
              {v.plate}
            </span>
          )}
        </div>
      )}

      <MileageUpdate v={v} />

      <div className="grid grid-cols-2 gap-3">
        {vItems.map((i) => {
          const d = computeDue(v, i, records, settings);
          return (
            <div
              key={i.id}
              className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-1">
                <span className="flex items-center gap-1.5 font-semibold">
                  <ItemIcon type={i.type} /> {i.title}
                </span>
                <button
                  aria-label={`${i.title} schedule`}
                  className="-m-1 p-1 text-muted-foreground"
                  onClick={() => setItemEdit(i)}
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </div>
              <StatusPill status={d.status} />
              <div className="flex-1">
                <DueLine d={d} />
              </div>
              <button className={`${btn} w-full text-sm`} onClick={() => setRecording(i)}>
                <Plus className="h-4 w-4" /> Record
              </button>
            </div>
          );
        })}
        <button
          className="flex min-h-32 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed p-4 text-sm font-medium text-muted-foreground"
          onClick={() => setItemEdit("new")}
        >
          <Plus className="h-5 w-5" /> Add item
          <span className="text-xs font-normal">Brakes, battery, fluids…</span>
        </button>
      </div>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">History</h2>
          <div
            className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1 text-xs"
            role="group"
            aria-label="Filter history"
          >
            {[{ id: "all", title: "All" }, ...vItems].map((f) => (
              <button
                key={f.id}
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 rounded-md px-2.5 py-1 ${filter === f.id ? "bg-card font-semibold shadow-card" : "text-muted-foreground"}`}
              >
                {f.title}
              </button>
            ))}
          </div>
        </div>
        <HistoryList
          records={history}
          empty="No service records yet. Tap “Record” on an item to log your last service."
        />
      </section>

      {recording && (
        <RecordDialog
          vehicle={v}
          item={recording}
          open
          onOpenChange={(o) => !o && setRecording(null)}
        />
      )}
      <ItemDialog
        vehicleId={v.id}
        item={itemEdit === "new" ? undefined : (itemEdit ?? undefined)}
        open={itemEdit !== null}
        onOpenChange={(o) => !o && setItemEdit(null)}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${name}?`}
        description={`This permanently deletes the vehicle, its ${vItems.length} maintenance items and ${vRecords.length} service records. To keep the history, archive it instead.`}
        confirmLabel="Delete vehicle"
        onConfirm={() => {
          actions.deleteVehicle(v.id);
          toast.success(`${name} deleted`);
          nav({ to: "/" });
        }}
      />
    </Shell>
  );
}

function MileageUpdate({ v }: { v: Vehicle }) {
  const [km, setKm] = useState("");
  const [err, setErr] = useState<string>();
  return (
    <form
      noValidate
      className="flex items-start gap-2 rounded-2xl border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(km);
        if (km.trim() === "" || !Number.isFinite(n) || n < 0)
          return setErr("Enter a reading of 0 or more");
        setErr(undefined);
        actions.updateVehicle(v.id, { mileage: n });
        setKm("");
        toast.success(`Odometer updated to ${fmtKm(n)}`);
      }}
    >
      <div className="flex-1">
        <Field
          label={`Odometer · ${v.mileage != null ? `now ${fmtKm(v.mileage)}` : "not set"}`}
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Update mileage"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          error={err}
        />
      </div>
      <button className={`${btnGhost} mt-5`}>Update</button>
    </form>
  );
}
