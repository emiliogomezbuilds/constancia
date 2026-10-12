import Link from "next/link";
import { requireUser } from "@/lib/session";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/compute";
import { formatMx } from "@/lib/format";
import { deleteAllDataAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { supabase, user } = await requireUser();
  const sp = await searchParams;
  const { data: records } = await supabase
    .from("income_records")
    .select("id,title,months_covered,avg_monthly,is_sample,created_at")
    .order("created_at", { ascending: false });

  return (
    <Shell email={user.email}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tus registros</h1>
        <Button asChild><Link href="/new">Subir documento</Link></Button>
      </div>
      {sp.deleted && <p className="mt-3 rounded bg-green-50 p-3 text-sm text-green-800">Se borraron todos tus datos.</p>}
      <div className="mt-6 space-y-3">
        {(records ?? []).length === 0 && <p className="text-slate-600">Aún no tienes registros. Sube un documento o prueba con el ejemplo inventado.</p>}
        {(records ?? []).map((r) => (
          <Link key={r.id} href={`/records/${r.id}`} className="block">
            <Card className="hover:border-blue-700">
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-sm text-slate-600">{r.months_covered} meses · promedio {money(Number(r.avg_monthly))} · {formatMx(r.created_at)}</p>
                </div>
                {r.is_sample && <Badge variant="warning">Simulado</Badge>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <form action={deleteAllDataAction} className="mt-10 border-t pt-4">
        <p className="mb-2 text-sm text-slate-600">Borra todos tus registros, constancias y permisos. No se puede deshacer.</p>
        <Button variant="destructive" size="sm">Borrar todos mis datos</Button>
      </form>
    </Shell>
  );
}
