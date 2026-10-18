import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  computeDue,
  dueReason,
  useStore,
  vehicleName,
  type DueInfo,
  type DueStatus,
  type MaintenanceItem,
  type Vehicle,
} from "@/lib/store";
import { Shell, StatusPill, ItemIcon, DueLine, EmptyState, btnSmall } from "@/components/ui-kit";
import { RecordDialog, ItemDialog } from "@/components/forms";
import { HistoryList } from "@/components/history";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Vehicle Maintenance Tracker" },
      {
        name: "description",
        content: "See what maintenance is overdue, due soon, and up to date across your vehicles.",
      },
      { property: "og:title", content: "Dashboard — Vehicle Maintenance Tracker" },
      {
        property: "og:description",
        content: "See what maintenance is overdue, due soon, and up to date across your vehicles.",
      },
    ],
  }),
  component: Dashboard,
});

type Row = { v: Vehicle; d: DueInfo };

const GROUPS: { key: string; title: string; match: (s: DueStatus) => boolean; empty?: string }[] = [
  { key: "overdue", title: "Overdue", match: (s) => s === "overdue", empty: "Nothing overdue." },
  { key: "soon", title: "Due soon", match: (s) => s === "soon", empty: "Nothing due soon." },
  { key: "ok", title: "Up to date", match: (s) => s === "ok" },
  { key: "todo", title: "Needs information", match: (s) => s === "none" || s === "unknown" },
];

function Dashboard() {
  const { vehicles, items, records, settings } = useStore();
  const [recording, setRecording] = useState<Row | null>(null);
  const [adjusting, setAdjusting] = useState<MaintenanceItem | null>(null);
  const active = vehicles.filter((v) => !v.archived);

  if (active.length === 0)
    return (
      <Shell title="Dashboard">
        <EmptyState>
          Add your first vehicle on the{" "}
          <Link to="/" className="font-semibold text-primary">
            Vehicles
          </Link>{" "}
          tab to see what's due.
        </EmptyState>
      </Shell>
    );

  const rows: Row[] = active.flatMap((v) =>
    items
      .filter((i) => i.vehicleId === v.id)
      .map((i) => ({ v, d: computeDue(v, i, records, settings) })),
  );
  const sortKey = (r: Row) => r.d.daysLeft ?? Number.MAX_SAFE_INTEGER;
  const activeIds = new Set(active.map((v) => v.id));
  const recent = [...records]
    .filter((r) => activeIds.has(r.vehicleId))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <Shell title="Dashboard">
      <div className="grid grid-cols-3 gap-2 text-center">
        {GROUPS.slice(0, 3).map((g) => (
          <a key={g.key} href={`#${g.key}`} className="rounded-xl border bg-card p-3">
            <p className="font-display text-2xl font-bold">
              {rows.filter((r) => g.match(r.d.status)).length}
            </p>
            <p className="text-xs text-muted-foreground">{g.title}</p>
          </a>
        ))}
      </div>

      {GROUPS.map((g) => {
        const list = rows
          .filter((r) => g.match(r.d.status))
          .sort((a, b) => sortKey(a) - sortKey(b));
        if (!list.length && !g.empty) return null;
        return (
          <section key={g.key} id={g.key} className="scroll-mt-20">
            <h2 className="mb-2 font-display text-lg font-bold">
              {g.title} <span className="text-muted-foreground">({list.length})</span>
            </h2>
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">{g.empty}</p>
            ) : (
              <ul className="space-y-2">
                {list.map((r) => (
                  <li key={r.d.item.id} className="rounded-2xl border bg-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link to="/vehicle/$id" params={{ id: r.v.id }} className="min-w-0">
                        <p className="flex items-center gap-1.5 font-semibold">
                          <ItemIcon type={r.d.item.type} /> {r.d.item.title}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">{vehicleName(r.v)}</p>
                      </Link>
                      <StatusPill status={r.d.status} />
                    </div>
                    <div className="mt-2">
                      {g.key === "ok" ? (
                        <DueLine d={r.d} compact />
                      ) : (
                        <p className="text-sm">{dueReason(r.d)}</p>
                      )}
                      {g.key !== "ok" && <DueLine d={r.d} compact />}
                    </div>
                    {g.key !== "ok" && (
                      <div className="mt-3 flex gap-2">
                        <button className={btnSmall} onClick={() => setRecording(r)}>
                          Log service
                        </button>
                        <button className={btnSmall} onClick={() => setAdjusting(r.d.item)}>
                          Adjust schedule
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <section>
        <h2 className="mb-2 font-display text-lg font-bold">Recently completed</h2>
        <HistoryList records={recent} showVehicle empty="No services logged yet." />
      </section>

      {recording && (
        <RecordDialog
          vehicle={recording.v}
          item={recording.d.item}
          open
          onOpenChange={(o) => !o && setRecording(null)}
        />
      )}
      {adjusting && (
        <ItemDialog
          vehicleId={adjusting.vehicleId}
          item={adjusting}
          open
          onOpenChange={(o) => !o && setAdjusting(null)}
        />
      )}
    </Shell>
  );
}
