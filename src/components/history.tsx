import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  actions,
  fmtDate,
  fmtKm,
  fmtMoney,
  useStore,
  vehicleName,
  type ServiceRecord,
} from "@/lib/store";
import { ItemIcon, ConfirmDialog, EmptyState } from "@/components/ui-kit";
import { RecordDialog } from "@/components/forms";

export function HistoryList({
  records,
  showVehicle,
  empty,
}: {
  records: ServiceRecord[];
  showVehicle?: boolean;
  empty: string;
}) {
  const { vehicles, items, settings } = useStore();
  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [deleting, setDeleting] = useState<ServiceRecord | null>(null);
  const sorted = [...records].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );

  if (sorted.length === 0) return <EmptyState>{empty}</EmptyState>;

  const editV = editing && vehicles.find((v) => v.id === editing.vehicleId);
  const editI = editing && items.find((i) => i.id === editing.itemId);
  const delI = deleting && items.find((i) => i.id === deleting.itemId);

  return (
    <>
      <ul className="divide-y rounded-2xl border bg-card">
        {sorted.map((r) => {
          const i = items.find((x) => x.id === r.itemId);
          const v = vehicles.find((x) => x.id === r.vehicleId);
          if (!i || !v) return null;
          const meta = [
            fmtDate(r.date),
            r.mileage != null ? fmtKm(r.mileage) : "",
            r.cost != null ? fmtMoney(r.cost, settings.currency) : "",
            r.provider ?? "",
          ].filter(Boolean);
          return (
            <li key={r.id} className="flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <ItemIcon type={i.type} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {i.title}
                  {r.product && (
                    <span className="font-normal text-muted-foreground"> · {r.product}</span>
                  )}
                </p>
                {showVehicle && <p className="text-sm font-medium">{vehicleName(v)}</p>}
                <p className="text-sm text-muted-foreground">{meta.join(" · ")}</p>
                {r.notes && <p className="truncate text-sm text-muted-foreground">{r.notes}</p>}
              </div>
              <button
                aria-label={`Edit ${i.title} record from ${fmtDate(r.date)}`}
                className="p-2 text-muted-foreground"
                onClick={() => setEditing(r)}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                aria-label={`Delete ${i.title} record from ${fmtDate(r.date)}`}
                className="p-2 text-muted-foreground"
                onClick={() => setDeleting(r)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
      {editV && editI && (
        <RecordDialog
          vehicle={editV}
          item={editI}
          record={editing}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this service record?"
        description={
          deleting
            ? `The ${delI?.title.toLowerCase() ?? "service"} record from ${fmtDate(deleting.date)} will be permanently removed, and the next due date will be recalculated from the remaining history.`
            : ""
        }
        onConfirm={() => {
          if (deleting) actions.deleteRecord(deleting.id);
          setDeleting(null);
          toast.success("Record deleted");
        }}
      />
    </>
  );
}
