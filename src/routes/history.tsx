import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import {
  useStore,
  vehicleName,
  ITEM_PRESETS,
  ITEM_TYPES,
  fmtMoney,
  type ItemType,
} from "@/lib/store";
import { Shell, SelectField, btnSmall } from "@/components/ui-kit";
import { HistoryList } from "@/components/history";
import { downloadCsv } from "@/lib/download";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Service History — Vehicle Maintenance Tracker" },
      {
        name: "description",
        content: "Review every service you've logged, filtered by vehicle and maintenance type.",
      },
      { property: "og:title", content: "Service History — Vehicle Maintenance Tracker" },
      {
        property: "og:description",
        content: "Review every service you've logged, filtered by vehicle and maintenance type.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const store = useStore();
  const { vehicles, items, records, settings } = store;
  const [vehicle, setVehicle] = useState("all");
  const [type, setType] = useState<"all" | ItemType>("all");

  const list = records.filter((r) => {
    if (vehicle !== "all" && r.vehicleId !== vehicle) return false;
    if (type !== "all" && items.find((i) => i.id === r.itemId)?.type !== type) return false;
    return true;
  });
  const total = list.reduce((s, r) => s + (r.cost ?? 0), 0);

  return (
    <Shell
      title="History"
      action={
        records.length > 0 && (
          <button className={btnSmall} onClick={() => downloadCsv(store)}>
            <Download className="h-4 w-4" /> CSV
          </button>
        )
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Vehicle" value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
          <option value="all">All vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {vehicleName(v)}
              {v.archived ? " (archived)" : ""}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Maintenance type"
          value={type}
          onChange={(e) => setType(e.target.value as "all" | ItemType)}
        >
          <option value="all">All types</option>
          {ITEM_TYPES.map((t) => (
            <option key={t} value={t}>
              {ITEM_PRESETS[t].title}
            </option>
          ))}
        </SelectField>
      </div>
      {list.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {list.length} record{list.length === 1 ? "" : "s"}
          {total > 0 && ` · ${fmtMoney(total, settings.currency)} spent`}
        </p>
      )}
      <HistoryList
        records={list}
        showVehicle
        empty={
          records.length
            ? "No records match these filters."
            : "No service records yet. Open a vehicle and tap “Record” to log a service."
        }
      />
    </Shell>
  );
}
