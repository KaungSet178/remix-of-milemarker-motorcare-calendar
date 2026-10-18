import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { computeDue, useStore, KIND_LABEL, fmtDate, fmtKm, today, type ServiceKind } from "@/lib/store";
import { Shell, KindIcon } from "@/components/ui-kit";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Maintenance Calendar — Oil & Tire Tracker" },
      { name: "description", content: "See past services and upcoming oil and tire changes on your calendar." },
      { property: "og:title", content: "Maintenance Calendar — Oil & Tire Tracker" },
      { property: "og:description", content: "See past services and upcoming oil and tire changes on your calendar." },
    ],
  }),
  component: CalendarPage,
});

type Ev = { date: string; kind: ServiceKind; vehicleId: string; label: string; detail: string; upcoming: boolean; overdue?: boolean };

function CalendarPage() {
  const { vehicles, records } = useStore();
  const t = today();
  const [cursor, setCursor] = useState(() => t.slice(0, 7));
  const [selected, setSelected] = useState(t);

  const events = useMemo(() => {
    const evs: Ev[] = [];
    for (const r of records) {
      const v = vehicles.find((x) => x.id === r.vehicleId);
      if (v) evs.push({ date: r.date, kind: r.kind, vehicleId: v.id, label: `${v.model} · ${v.plate}`, detail: `Done at ${fmtKm(r.mileage)}${r.product ? ` · ${r.product}` : ""}`, upcoming: false });
    }
    for (const v of vehicles)
      for (const k of ["oil", "tire"] as const) {
        const d = computeDue(v, records, k);
        if (d.nextDate) evs.push({ date: d.nextDate, kind: k, vehicleId: v.id, label: `${v.model} · ${v.plate}`, detail: `Due by ${fmtKm(d.nextMileage!)}`, upcoming: true, overdue: d.status === "overdue" });
      }
    return evs;
  }, [vehicles, records]);

  const [y = 2026, m = 1] = cursor.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: offset + daysInMonth }, (_, i) => (i < offset ? null : `${cursor}-${String(i - offset + 1).padStart(2, "0")}`));
  const shift = (n: number) => { const d = new Date(y, m - 1 + n, 1); setCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
  const dayEvents = events.filter((e) => e.date === selected);
  const upcoming = events.filter((e) => e.upcoming).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Shell title="Calendar">
      <div className="rounded-2xl border bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <button aria-label="Previous month" onClick={() => shift(-1)} className="p-2"><ChevronLeft className="h-5 w-5" /></button>
          <p className="font-display font-bold">{first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
          <div className="flex items-center gap-1">
            {cursor !== t.slice(0, 7) && (
              <button onClick={() => { setCursor(t.slice(0, 7)); setSelected(t); }} className="rounded-md px-2 py-1 text-xs font-semibold text-primary">
                Today
              </button>
            )}
            <button aria-label="Next month" onClick={() => shift(1)} className="p-2"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="py-1">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c) return <span key={i} />;
            const evs = events.filter((e) => e.date === c);
            return (
              <button
                key={c}
                onClick={() => setSelected(c)}
                aria-label={`${fmtDate(c)}${evs.length ? `, ${evs.length} event${evs.length > 1 ? "s" : ""}` : ""}`}
                aria-pressed={selected === c}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm ${selected === c ? "bg-primary text-primary-foreground" : c === t ? "bg-muted font-bold" : ""}`}
              >
                {Number(c.slice(8))}
                <span className="mt-0.5 flex h-1.5 gap-0.5">
                  {evs.slice(0, 3).map((e, j) => <span key={j} className={`h-1.5 w-1.5 rounded-full ${e.overdue ? "bg-destructive" : e.upcoming ? "bg-warning" : "bg-success"}`} />)}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" />Done</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" />Due</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" />Overdue</span>
        </div>
      </div>

      <section>
        <h2 className="mb-2 font-display font-bold">{fmtDate(selected)}</h2>
        {dayEvents.length ? <EvList evs={dayEvents} /> : <p className="text-sm text-muted-foreground">Nothing on this day.</p>}
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-bold">Upcoming services</h2>
        {upcoming.length ? <EvList evs={upcoming} showDate /> : <p className="text-sm text-muted-foreground">Record a service to see upcoming dates.</p>}
      </section>
    </Shell>
  );
}

function EvList({ evs, showDate }: { evs: Ev[]; showDate?: boolean }) {
  return (
    <ul className="divide-y rounded-2xl border bg-card">
      {evs.map((e, i) => (
        <li key={i}>
          <Link to="/vehicle/$id" params={{ id: e.vehicleId }} className="flex items-center gap-3 p-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${e.overdue ? "bg-destructive/15 text-destructive" : e.upcoming ? "bg-warning/25 text-warning-foreground" : "bg-success/15 text-success"}`}><KindIcon kind={e.kind} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{e.upcoming ? (e.overdue ? "Overdue: " : "Due: ") : "Done: "}{KIND_LABEL[e.kind]}</p>
              <p className="truncate text-sm text-muted-foreground">{e.label} · {e.detail}</p>
            </div>
            {showDate && <span className="text-xs text-muted-foreground">{fmtDate(e.date)}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
