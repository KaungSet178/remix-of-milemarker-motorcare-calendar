import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { actions, useStore } from "@/lib/store";
import { downloadCsv } from "@/lib/download";
import { Shell, Field, SelectField, btnGhost } from "@/components/ui-kit";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Vehicle Maintenance Tracker" },
      {
        name: "description",
        content: "Configure reminder lead time and notification preferences.",
      },
      { property: "og:title", content: "Settings — Vehicle Maintenance Tracker" },
      {
        property: "og:description",
        content: "Configure reminder lead time and notification preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

const CURRENCIES = ["USD", "EUR", "GBP", "MMK", "THB", "SGD", "JPY", "INR", "AUD"];

function SettingsPage() {
  const store = useStore();
  const { settings, records } = store;

  return (
    <Shell title="Settings">
      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <div>
          <h2 className="font-display text-lg font-bold">Reminders</h2>
          <p className="text-sm text-muted-foreground">
            An item turns “Due soon” when either threshold is within this range.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberSetting
            label="Days before due date"
            value={settings.leadDays}
            onCommit={(n) => actions.updateSettings({ leadDays: n })}
          />
          <NumberSetting
            label="Km before due mileage"
            value={settings.leadKm}
            onCommit={(n) => actions.updateSettings({ leadKm: n })}
          />
        </div>
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block font-medium">In-app reminders</span>
            <span className="block text-sm text-muted-foreground">
              Show due-soon and overdue banners on the Vehicles screen.
            </span>
          </span>
          <Switch
            checked={settings.inAppReminders}
            onCheckedChange={(c) => actions.updateSettings({ inAppReminders: c })}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Push and email notifications aren't available yet.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Units</h2>
        <SelectField
          label="Currency for service costs"
          value={settings.currency}
          onChange={(e) => actions.updateSettings({ currency: e.target.value })}
        >
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </SelectField>
        <p className="text-sm text-muted-foreground">Distances are shown in kilometres.</p>
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Your data</h2>
        <p className="text-sm text-muted-foreground">
          Everything is stored only in this browser on this device. Export a copy to keep a backup.
        </p>
        <button className={btnGhost} disabled={!records.length} onClick={() => downloadCsv(store)}>
          <Download className="h-4 w-4" /> Export service history (CSV)
        </button>
      </section>

      <p className="px-1 text-xs text-muted-foreground">
        Service intervals in this app are suggestions, not manufacturer guidance. Follow your
        vehicle manual or a qualified professional.
      </p>
    </Shell>
  );
}

function NumberSetting({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [err, setErr] = useState<string>();
  return (
    <Field
      label={label}
      type="number"
      inputMode="numeric"
      min={0}
      value={draft ?? String(value)}
      error={err}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft === null) return;
        const n = Number(draft);
        if (draft.trim() === "" || !Number.isFinite(n) || n < 0) return setErr("Use 0 or more");
        setErr(undefined);
        onCommit(Math.round(n));
        setDraft(null);
        toast.success("Reminder settings saved");
      }}
    />
  );
}
