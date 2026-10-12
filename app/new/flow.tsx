"use client";
import { useActionState } from "react";
import { analyzeAction, saveRecordAction, type AnalyzeState, type SaveState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/compute";

const A0: AnalyzeState = {};
const S0: SaveState = {};

export function NewFlow() {
  const [a, analyze, analyzing] = useActionState(analyzeAction, A0);
  const [s, save, saving] = useActionState(saveRecordAction, S0);
  const an = a.analysis;

  if (!an) {
    return (
      <form action={analyze} className="mt-4 space-y-4">
        <ol className="list-decimal space-y-1 rounded bg-blue-50 p-3 pl-8 text-sm text-slate-800">
          <li><strong>Pega o sube</strong> los movimientos de tu banco.</li>
          <li><strong>Revisa</strong> los depósitos que encontramos y desmarca los que no son ingreso tuyo.</li>
          <li><strong>Guarda.</strong> Después, si quieres, creas un enlace con vencimiento para enseñar tus cifras.</li>
        </ol>
        {a.error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{a.error}</p>}
        <label className="block text-sm font-medium">Tipo de documento
          <select name="source_kind" className="mt-1 block w-full rounded border p-2">
            <option value="estado_cuenta">Estado de cuenta bancario</option>
            <option value="imss">Constancia de semanas IMSS</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <label className="block text-sm font-medium">Pega aquí los movimientos
          <textarea name="text" rows={8} className="mt-1 block w-full rounded border p-2 font-mono text-xs" placeholder={"03/09/2026 ABONO SPEI RECIBIDO 1,200.00 5,430.55"} />
        </label>
        <label className="block text-sm font-medium">…o sube un archivo .csv o .txt (máx. 200 KB)
          <input type="file" name="file" accept=".csv,.txt" className="mt-1 block text-sm" />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="consent_process" className="mt-1" />
          <span>Permito que Constancia lea este documento para calcular cifras. No se guarda el texto completo.</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="consent_ai" className="mt-1" />
          <span>Opcional: permito enviar el texto a la IA de Google (Gemini, capa gratuita, puede usarse para mejorar sus productos) para encontrar más depósitos. Cada fila se comprueba contra mi texto.</span>
        </label>
        <div className="flex gap-3">
          <Button disabled={analyzing}>{analyzing ? "Leyendo…" : "Leer documento"}</Button>
          <Button type="submit" name="use_sample" value="1" variant="outline" disabled={analyzing}>Probar con ejemplo inventado</Button>
        </div>
      </form>
    );
  }

  return (
    <form action={save} className="mt-4 space-y-4">
      {an.isSample && <Badge variant="warning">Simulado: documento de ejemplo inventado</Badge>}
      {s.error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{s.error}</p>}
      <p className="text-sm text-slate-700">Encontramos {an.rows.length} depósitos. Desmarca los que no sean ingreso tuyo (por ejemplo, transferencias de familiares o entre tus cuentas).</p>
      {an.warnings.map((w) => <p key={w} className="rounded bg-amber-50 p-2 text-sm text-amber-900">{w}</p>)}
      {an.aiNote && <p className="rounded bg-slate-100 p-2 text-sm">{an.aiNote}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-slate-500"><th className="py-2">Incluir</th><th>Fecha</th><th>Descripción</th><th className="text-right">Monto</th><th className="pl-3">Línea</th></tr></thead>
          <tbody>
            {an.rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-2"><input type="checkbox" name="include" value={r.id} defaultChecked aria-label={`Incluir ${r.date}`} /></td>
                <td>{r.date}</td>
                <td>{r.description || "—"}{r.method === "ai" && <Badge variant="outline" className="ml-2">IA</Badge>}{r.ambiguous && <Badge variant="warning" className="ml-2">Revisar monto</Badge>}</td>
                <td className="text-right tabular-nums">{money(r.amount)}</td>
                <td className="pl-3 text-slate-500">{r.line}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label className="block text-sm font-medium">Título (opcional)
        <input name="title" maxLength={80} className="mt-1 block w-full rounded border p-2" />
      </label>
      <input type="hidden" name="source_text" value={an.sourceText} />
      <input type="hidden" name="source_kind" value={an.sourceKind} />
      <input type="hidden" name="source_name" value={an.sourceName ?? ""} />
      <input type="hidden" name="is_sample" value={an.isSample ? "1" : "0"} />
      <input type="hidden" name="rows" value={JSON.stringify(an.rows)} />
      <input type="hidden" name="consent_process" value="on" />
      {an.aiConsent && <input type="hidden" name="consent_ai" value="on" />}
      <Button disabled={saving}>{saving ? "Guardando…" : "Calcular y guardar"}</Button>
    </form>
  );
}
