// All figures come from this file, never from the AI. Integer cents avoid floating-point drift.
// Deliberately NO grade, score, rating or "consistency" label: only the raw monthly shape.
import { monthOf, monthRange } from "@/lib/dates";

export type MonthFigure = { month: string; total: number; deposits: number };

export type Figures = {
  months: MonthFigure[];
  monthsCovered: number;
  total: number;
  avgMonthly: number;
  minMonth: string;
  minAmount: number;
  maxMonth: string;
  maxAmount: number;
  deposits: number;
  periodStart: string;
  periodEnd: string;
};

export const MAX_SPAN_MONTHS = 36;

export function computeFigures(rows: Array<{ date: string; amount: number }>): Figures {
  if (rows.length === 0) throw new Error("no_rows");
  const dates = rows.map((r) => r.date).sort();
  const periodStart = dates[0];
  const periodEnd = dates[dates.length - 1];
  const range = monthRange(monthOf(periodStart), monthOf(periodEnd));
  if (range.length > MAX_SPAN_MONTHS) throw new Error("span_too_long");

  const cents = new Map<string, { c: number; n: number }>(range.map((m) => [m, { c: 0, n: 0 }]));
  for (const r of rows) {
    const e = cents.get(monthOf(r.date))!;
    e.c += Math.round(r.amount * 100);
    e.n += 1;
  }
  const months: MonthFigure[] = range.map((m) => ({ month: m, total: cents.get(m)!.c / 100, deposits: cents.get(m)!.n }));
  const totalC = [...cents.values()].reduce((a, e) => a + e.c, 0);
  const lowest = months.reduce((a, b) => (b.total < a.total ? b : a));
  const highest = months.reduce((a, b) => (b.total > a.total ? b : a));
  return {
    months,
    monthsCovered: range.length,
    total: totalC / 100,
    avgMonthly: Math.round(totalC / range.length) / 100,
    minMonth: lowest.month,
    minAmount: lowest.total,
    maxMonth: highest.month,
    maxAmount: highest.total,
    deposits: rows.length,
    periodStart,
    periodEnd,
  };
}

export function money(n: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }).format(n);
}
