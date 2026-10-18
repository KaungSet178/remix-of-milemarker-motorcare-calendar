import { toCsv, today, type State } from "@/lib/store";

export function downloadCsv(s: State) {
  const blob = new Blob([toCsv(s)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `service-history-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
