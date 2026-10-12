import Link from "next/link";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <Shell>
      <h1 className="text-3xl font-bold">Tus ingresos, mes por mes, con la fuente a la vista.</h1>
      <p className="mt-3 text-slate-700">
        Sube tu estado de cuenta (texto o .csv). El código calcula tus depósitos por mes y te muestra de qué línea sale cada cifra.
        Tú decides si generas una constancia para alguien y cuándo deja de funcionar.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild size="lg"><Link href="/login">Empezar con Google</Link></Button>
        <Button asChild size="lg" variant="outline"><Link href="/privacy">Qué guardamos</Link></Button>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          ["Sin etiquetas", "No hay etiquetas, notas ni opiniones sobre ti. Solo cifras y su fuente."],
          ["Tú controlas", "Constancias con fecha de vencimiento. Las revocas cuando quieras y ves cuándo se abrieron."],
          ["Límites claros", "Es un documento tuyo, sin verificación de terceros. Lo decimos en cada constancia."],
        ].map(([t, d]) => (
          <Card key={t}><CardContent className="pt-6"><h2 className="font-semibold">{t}</h2><p className="mt-1 text-sm text-slate-600">{d}</p></CardContent></Card>
        ))}
      </div>
    </Shell>
  );
}
