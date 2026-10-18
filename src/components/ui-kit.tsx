import { Link, useLocation } from "@tanstack/react-router";
import type {
  ReactNode,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import {
  CalendarDays,
  Car,
  Droplet,
  CircleDot,
  Disc3,
  BatteryFull,
  FlaskConical,
  ClipboardCheck,
  Wrench,
  LayoutDashboard,
  History,
  Settings,
  AlertOctagon,
  Clock,
  CheckCircle2,
  HelpCircle,
  CircleDashed,
} from "lucide-react";
import type { DueInfo, ItemType } from "@/lib/store";
import { fmtDate, fmtKm } from "@/lib/store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const NAV = [
  {
    to: "/",
    label: "Vehicles",
    Icon: Car,
    match: (p: string) => p === "/" || p.startsWith("/vehicle"),
  },
  {
    to: "/dashboard",
    label: "Dashboard",
    Icon: LayoutDashboard,
    match: (p: string) => p.startsWith("/dashboard"),
  },
  {
    to: "/calendar",
    label: "Calendar",
    Icon: CalendarDays,
    match: (p: string) => p.startsWith("/calendar"),
  },
  {
    to: "/history",
    label: "History",
    Icon: History,
    match: (p: string) => p.startsWith("/history"),
  },
  {
    to: "/settings",
    label: "Settings",
    Icon: Settings,
    match: (p: string) => p.startsWith("/settings"),
  },
] as const;

export function Shell({
  title,
  back,
  children,
  action,
}: {
  title: ReactNode;
  back?: boolean;
  children: ReactNode;
  action?: ReactNode;
}) {
  const loc = useLocation();
  return (
    <div className="mx-auto min-h-screen max-w-xl pb-28">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/90 px-5 py-4 backdrop-blur">
        {back && (
          <Link to="/" className="text-sm text-muted-foreground">
            ← Back
          </Link>
        )}
        <h1 className="min-w-0 truncate font-display text-2xl font-bold tracking-tight">{title}</h1>
        <div className="ml-auto shrink-0">{action}</div>
      </header>
      <main className="space-y-5 px-5">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-card" aria-label="Main">
        <div className="mx-auto flex max-w-xl">
          {NAV.map(({ to, label, Icon, match }) => {
            const active = match(loc.pathname);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}
              >
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

const inputCls =
  "w-full rounded-lg border bg-background px-3 py-2.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 aria-[invalid=true]:border-destructive";

function FieldWrap({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
      {error ? (
        <span className="block text-sm text-destructive">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

type Extra = { label: string; error?: string | undefined; hint?: string | undefined };

export function Field({ label, error, hint, ...p }: Extra & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldWrap label={label} error={error} hint={hint}>
      <input {...p} aria-invalid={!!error} className={inputCls} />
    </FieldWrap>
  );
}
export function TextArea({
  label,
  error,
  hint,
  ...p
}: Extra & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldWrap label={label} error={error} hint={hint}>
      <textarea rows={2} {...p} aria-invalid={!!error} className={inputCls} />
    </FieldWrap>
  );
}
export function SelectField({
  label,
  error,
  hint,
  children,
  ...p
}: Extra & { children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldWrap label={label} error={error} hint={hint}>
      <select {...p} aria-invalid={!!error} className={inputCls}>
        {children}
      </select>
    </FieldWrap>
  );
}

export const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground active:scale-[0.98] transition disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-lg border bg-card px-4 py-2.5 font-medium";
export const btnSmall =
  "inline-flex items-center justify-center gap-1 rounded-md border bg-card px-2.5 py-1 text-sm font-medium";

const ITEM_ICONS: Record<ItemType, typeof Droplet> = {
  oil: Droplet,
  tire: CircleDot,
  brakes: Disc3,
  battery: BatteryFull,
  fluids: FlaskConical,
  inspection: ClipboardCheck,
  custom: Wrench,
};
export function ItemIcon({ type, className = "h-4 w-4" }: { type: ItemType; className?: string }) {
  const Icon = ITEM_ICONS[type];
  return <Icon className={className} aria-hidden />;
}

const STATUS = {
  overdue: {
    cls: "bg-destructive text-destructive-foreground",
    text: "Overdue",
    Icon: AlertOctagon,
  },
  soon: { cls: "bg-warning text-warning-foreground", text: "Due soon", Icon: Clock },
  ok: { cls: "bg-success text-success-foreground", text: "On track", Icon: CheckCircle2 },
  unknown: { cls: "bg-muted text-foreground border", text: "Needs mileage", Icon: HelpCircle },
  none: { cls: "bg-muted text-muted-foreground", text: "No record", Icon: CircleDashed },
};

export function StatusPill({ status }: { status: DueInfo["status"] }) {
  const { cls, text, Icon } = STATUS[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {text}
    </span>
  );
}

/** "Next by Apr 17, 2027 or 205,000 km" from the sketch, plus which threshold triggered the status. */
export function DueLine({ d, compact }: { d: DueInfo; compact?: boolean }) {
  if (d.status === "none")
    return <p className="text-sm text-muted-foreground">Log a service to estimate the next one</p>;
  const targets = [
    d.nextDate ? fmtDate(d.nextDate) : "",
    d.nextMileage != null ? fmtKm(d.nextMileage) : "",
  ].filter(Boolean);
  const basis = d.trigger === "both" ? "date and mileage" : d.trigger;
  return (
    <div className="text-sm text-muted-foreground">
      {targets.length > 0 && (
        <p>
          Next by <b className="text-foreground">{targets.join(" or ")}</b>
        </p>
      )}
      {!compact && (
        <p>
          {basis && (
            <span className="font-medium text-foreground">
              {d.status === "overdue" ? "Overdue" : "Due soon"} by {basis}.{" "}
            </span>
          )}
          {d.daysLeft != null &&
            (d.daysLeft < 0 ? `${-d.daysLeft} days late` : `${d.daysLeft} days left`)}
          {d.daysLeft != null && d.kmLeft != null && " · "}
          {d.kmLeft != null &&
            (d.kmLeft <= 0 ? `${fmtKm(-d.kmLeft)} over` : `${fmtKm(d.kmLeft)} left`)}
        </p>
      )}
      {d.mileageUnknown && (
        <p className="text-foreground">Mileage status needs an odometer update.</p>
      )}
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-2xl sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
