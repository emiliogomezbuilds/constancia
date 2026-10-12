import { monthLabel } from "@/lib/dates";
import { money } from "@/lib/compute";

type M = { month: string; total: number; deposits: number };

export function MonthsTable({ months }: { months: M[] }) {
  const max = Math.max(...months.map((m) => Number(m.total)), 1);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-slate-500">
          <th className="py-2 font-medium">Mes</th>
          <th className="py-2 font-medium">Depósitos</th>
          <th className="py-2 text-right font-medium">Total</th>
          <th className="w-1/3 py-2" aria-hidden />
        </tr>
      </thead>
      <tbody>
        {months.map((m) => (
          <tr key={m.month} className="border-b last:border-0">
            <td className="py-2">{monthLabel(m.month)}</td>
            <td className="py-2">{m.deposits}</td>
            <td className="py-2 text-right tabular-nums">{money(Number(m.total))}</td>
            <td className="py-2 pl-3">
              <div className="h-2 rounded bg-blue-700" style={{ width: `${(Number(m.total) / max) * 100}%` }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
