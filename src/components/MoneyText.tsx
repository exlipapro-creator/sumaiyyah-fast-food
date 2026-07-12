"use client";
import { formatTSH } from "@/lib/money";

export default function MoneyText({ amount, className }: { amount: number; className?: string }) {
  return <span className={`tabular-nums ${className || ""}`}>{formatTSH(amount)}</span>;
}
