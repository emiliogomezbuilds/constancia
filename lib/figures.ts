// Rebuilds Figures from a stored income_records row. Pure, no I/O.
import type { Figures } from "@/lib/compute";

export function recordFigures(r: {
  months: Array<{ month: string; total: number; deposits: number }>; months_covered: number; total_amount: number | string;
  avg_monthly: number | string; min_month: string; min_amount: number | string; deposits_included: number;
  period_start: string; period_end: string;
}): Figures {
  const months = r.months.map((m) => ({ month: m.month, total: Number(m.total), deposits: Number(m.deposits) }));
  const hi = months.reduce((a, b) => (b.total > a.total ? b : a));
  return {
    months, monthsCovered: r.months_covered, total: Number(r.total_amount), avgMonthly: Number(r.avg_monthly),
    minMonth: r.min_month, minAmount: Number(r.min_amount), maxMonth: hi.month, maxAmount: hi.total,
    deposits: r.deposits_included, periodStart: r.period_start, periodEnd: r.period_end,
  };
}
