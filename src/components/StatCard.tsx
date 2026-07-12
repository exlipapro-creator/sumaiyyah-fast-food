import MoneyText from "./MoneyText";

interface StatCardProps {
  testId: string;
  label: string;
  value: number;
  subLabel?: string;
  color?: "amber" | "emerald" | "sky" | "rose";
  isMoney?: boolean;
}

export default function StatCard({ testId, label, value, subLabel, color = "amber", isMoney = true }: StatCardProps) {
  const colorClass = {
    amber: "text-amber-500",
    emerald: "text-emerald-500",
    sky: "text-sky-400",
    rose: "text-rose-400",
  }[color];

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 shadow-lg shadow-black/20 p-5">
      <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">{label}</div>
      <div data-testid={testId} className={`text-2xl font-bold tabular-nums ${colorClass}`}>
        {isMoney ? <MoneyText amount={value} /> : value.toLocaleString("en-US")}
      </div>
      {subLabel && <div className="text-xs text-slate-400 mt-1">{subLabel}</div>}
    </div>
  );
}
