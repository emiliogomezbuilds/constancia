import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { Shell } from "@/components/shell";
import { MonthsTable } from "@/components/months-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { money } from "@/lib/compute";
import { monthLabel } from "@/lib/dates";
import { formatMx } from "@/lib/format";
import { SELF_SUPPLIED_LABEL } from "@/lib/wording";
import { createCertificateAction, deleteRecordAction, revokeCertificateAction } from "@/app/actions";
import { Explain } from "./explain";

export const dynamic = "force-dynamic";

const isPast = (iso: string) => new Date(iso).getTime() < Date.now();

export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase, user } = await requireUser();
  const { data: r } = await supabase.from("income_records").select("*").eq("id", id).maybeSingle();
  if (!r) notFound();
  const { data: certs } = await supabase.from("certificates").select("id,token,expires_at,revoked_at,created_at").eq("record_id", id).order("created_at", { ascending: false });
  const ids = (certs ?? []).map((c) => c.id);
  const { data: views } = ids.length ? await supabase.from("certificate_views").select("certificate_id,viewed_at").in("certificate_id", ids).order("viewed_at", { ascending: false }) : { data: [] };

  return (
    <Shell email={user.email}>
      <Link href="/dashboard" className="text-sm text-blue-800 hover:underline">← Mis registros</Link>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">{r.title}</h1>
        {r.is_sample && <Badge variant="warning">Simulado</Badge>}
      </div>
      <p className="mt-1 text-sm text-slate-600">{SELF_SUPPLIED_LABEL}. Lectura: {r.reading_method === "ai_verified" ? "reglas + IA, cada fila comprobada contra el texto" : "reglas, sin IA"}.</p>

      <Card className="mt-6">
        <CardHeader><CardTitle>Cifras (calculadas por código)</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><dt className="text-slate-500">Meses</dt><dd className="text-lg font-semibold">{r.months_covered}</dd></div>
            <div><dt className="text-slate-500">Promedio mensual</dt><dd className="text-lg font-semibold">{money(Number(r.avg_monthly))}</dd></div>
            <div><dt className="text-slate-500">Mes más bajo</dt><dd className="text-lg font-semibold">{money(Number(r.min_amount))}</dd><dd className="text-xs text-slate-500">{monthLabel(r.min_month)}</dd></div>
            <div><dt className="text-slate-500">Total</dt><dd className="text-lg font-semibold">{money(Number(r.total_amount))}</dd></div>
          </dl>
          <div className="mt-4"><MonthsTable months={r.months} /></div>
          <p className="mt-3 text-xs text-slate-500">{r.deposits_included} de {r.deposits_detected} depósitos detectados incluidos. Huella del texto: {String(r.source_hash).slice(0, 12)}…</p>
        </CardContent>
      </Card>

      <Explain recordId={r.id} />

      <Card className="mt-6">
        <CardHeader><CardTitle>Constancias</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form action={createCertificateAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="record_id" value={r.id} />
            <label className="text-sm">Vigencia
              <select name="days" defaultValue="30" className="ml-2 rounded border p-2">
                <option value="7">7 días</option><option value="30">30 días</option><option value="90">90 días</option>
              </select>
            </label>
            <Button>Crear constancia</Button>
          </form>
          {(certs ?? []).map((c) => {
            const revoked = !!c.revoked_at;
            const expired = isPast(c.expires_at);
            const mine = (views ?? []).filter((v) => v.certificate_id === c.id);
            return (
              <div key={c.id} className="rounded border p-3 text-sm">
                <div className="flex items-center gap-2">
                  {revoked ? <Badge variant="destructive">Revocada</Badge> : expired ? <Badge variant="outline">Vencida</Badge> : <Badge variant="success">Activa</Badge>}
                  <span className="text-slate-600">vence {formatMx(c.expires_at)}</span>
                </div>
                {!revoked && !expired && <p className="mt-2 break-all font-mono text-xs">/c/{c.token}</p>}
                <p className="mt-2 text-slate-600">Aperturas: {mine.length}{mine[0] ? ` · última ${formatMx(mine[0].viewed_at)}` : ""}</p>
                {!revoked && !expired && (
                  <form action={revokeCertificateAction} className="mt-2">
                    <input type="hidden" name="certificate_id" value={c.id} /><input type="hidden" name="record_id" value={r.id} />
                    <Button variant="outline" size="sm">Revocar</Button>
                  </form>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <form action={deleteRecordAction} className="mt-8">
        <input type="hidden" name="record_id" value={r.id} />
        <Button variant="destructive" size="sm">Borrar este registro</Button>
      </form>
    </Shell>
  );
}
