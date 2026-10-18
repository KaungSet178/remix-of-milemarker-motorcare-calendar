import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { CalendarDays, Car, Droplet, CircleDot } from "lucide-react";
import type { DueInfo, ServiceKind } from "@/lib/store";
import { fmtDate, fmtKm } from "@/lib/store";

export function Shell({ title, back, children, action }: { title: string; back?: boolean; children: ReactNode; action?: ReactNode }) {
  const loc = useLocation();
  return (
    <div className="mx-auto min-h-screen max-w-xl pb-28">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/90 px-5 py-4 backdrop-blur">
        {back && (
          <Link to="/" className="text-sm text-muted-foreground">
            ← Back
          </Link>
        )}
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        <div className="ml-auto">{action}</div>
      </header>
      <main className="space-y-5 px-5">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-card">
        <div className="mx-auto flex max-w-xl">
          {[
            { to: "/", label: "Vehicles", Icon: Car },
            { to: "/calendar", label: "Calendar", Icon: CalendarDays },
          ].map(({ to, label, Icon }) => {
            const active = to === "/" ? loc.pathname === "/" || loc.pathname.startsWith("/vehicle") : loc.pathname.startsWith(to);
            return (
              <Link key={to} to={to} className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function Field({ label, ...p }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <input {...p} className="w-full rounded-lg border bg-background px-3 py-2.5 text-base outline-none focus:border-primary" />
    </label>
  );
}
export function SelectField({ label, children, ...p }: { label: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <select {...p} className="w-full rounded-lg border bg-background px-3 py-2.5 text-base outline-none focus:border-primary">
        {children}
      </select>
    </label>
  );
}
export const btn = "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground active:scale-[0.98] transition";
export const btnGhost = "inline-flex items-center justify-center gap-2 rounded-lg border bg-card px-4 py-2.5 font-medium";

export function KindIcon({ kind, className = "h-4 w-4" }: { kind: ServiceKind; className?: string }) {
  return kind === "oil" ? <Droplet className={className} /> : <CircleDot className={className} />;
}

const statusStyle = {
  overdue: "bg-destructive text-destructive-foreground",
  soon: "bg-warning text-warning-foreground",
  ok: "bg-success text-success-foreground",
  none: "bg-muted text-muted-foreground",
};
const statusText = { overdue: "Overdue", soon: "Due soon", ok: "On track", none: "No record" };

export function StatusPill({ status }: { status: DueInfo["status"] }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle[status]}`}>{statusText[status]}</span>;
}

export function DueLine({ d }: { d: DueInfo }) {
  if (d.status === "none") return <p className="text-sm text-muted-foreground">Add a record to estimate next service</p>;
  const days = d.daysLeft!;
  const km = d.kmLeft!;
  return (
    <p className="text-sm text-muted-foreground">
      Next by <b className="text-foreground">{fmtDate(d.nextDate!)}</b> or <b className="text-foreground">{fmtKm(d.nextMileage!)}</b>
      <br />
      {days < 0 ? `${-days} days late` : `${days} days left`} · {km <= 0 ? `${fmtKm(-km)} over` : `${fmtKm(km)} left`}
    </p>
  );
}
