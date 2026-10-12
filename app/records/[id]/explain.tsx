"use client";
import { useActionState } from "react";
import { explainAction, type ExplainState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Explain({ recordId }: { recordId: string }) {
  const [st, run, pending] = useActionState(explainAction, {} as ExplainState);
  return (
    <form action={run} className="mt-6 rounded border bg-white p-4">
      <input type="hidden" name="record_id" value={recordId} />
      <p className="text-sm text-slate-700">Explicación en palabras de las cifras de arriba. Solo describe; no opina.</p>
      <Button className="mt-2" variant="outline" size="sm" disabled={pending}>{pending ? "Escribiendo…" : "Explicar mis cifras"}</Button>
      {st.text && (
        <div className="mt-3 text-sm">
          <Badge variant="outline">{st.source === "ia" ? "Redactado por IA, cifras de código" : "Texto fijo"}</Badge>
          <p className="mt-2">{st.text}</p>
        </div>
      )}
      {st.note && <p className="mt-2 text-xs text-slate-500">{st.note}</p>}
    </form>
  );
}
