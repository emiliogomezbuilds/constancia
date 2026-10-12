import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/shell";
import { MonthsTable } from "@/components/months-table";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/compute";
import { monthLabel } from "@/lib/dates";
import { formatMx } from "@/lib/format";
import { ACCEPTOR_LIMIT, SELF_SUPPLIED_LABEL } from "@/lib/wording";
import { PrintButton } from "./print";

export const dynamic = "force-dynamic";
export const metadata = { title: "Constancia de ingresos", robots: { index: false, follow: false } };

export default async function Certificate({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_certificate", { p_token: token });
  const c = data as null | Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  if (!c) {
    return (
      <Shell>
        <h1 className="text-xl font-bold">Esta constancia no está disponible</h1>
        <p className="mt-2 text-slate-700">El enlace no existe, venció o la persona lo revocó.</p>
      </Shell>
    );
  }
  return (
    <Shell>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">Constancia de ingresos</h1>
        {c.is_sample && <Badge variant="warning">Simulado</Badge>}
      </div>
      <p className="mt-1 text-sm text-slate-600">{c.title}</p>
      <p className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-900">{SELF_SUPPLIED_LABEL}. {ACCEPTOR_LIMIT}</p>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><dt className="text-slate-500">Meses</dt><dd className="text-lg font-semibold">{c.months_covered}</dd></div>
        <div><dt className="text-slate-500">Promedio mensual</dt><dd className="text-lg font-semibold">{money(Number(c.avg_monthly))}</dd></div>
        <div><dt className="text-slate-500">Mes más bajo</dt><dd className="text-lg font-semibold">{money(Number(c.min_amount))}</dd><dd className="text-xs text-slate-500">{monthLabel(c.min_month)}</dd></div>
        <div><dt className="text-slate-500">Total</dt><dd className="text-lg font-semibold">{money(Number(c.total_amount))}</dd></div>
      </dl>
      <div className="mt-5"><MonthsTable months={c.months} /></div>
      <p className="mt-4 text-xs text-slate-500">
        {c.deposits_included} de {c.deposits_detected} depósitos detectados incluidos · lectura {c.reading_method === "ai_verified" ? "con IA, cada fila comprobada contra el texto" : "por reglas"} · huella {String(c.source_hash).slice(0, 12)}… ·
        emitida {formatMx(c.issued_at)} · vence {formatMx(c.expires_at)}
      </p>
      <PrintButton />
    </Shell>
  );
}
