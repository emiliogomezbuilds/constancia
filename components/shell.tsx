import Link from "next/link";

export function Shell({ children, email }: { children: React.ReactNode; email?: string | null }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href={email ? "/dashboard" : "/"} className="text-lg font-semibold text-blue-800">Constancia</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/privacy" className="text-slate-600 hover:underline">Privacidad</Link>
            {email ? (
              <form action="/logout" method="post"><button className="text-slate-600 hover:underline">Salir</button></form>
            ) : (
              <Link href="/login" className="text-blue-800 hover:underline">Entrar</Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 pb-8 text-xs text-slate-500 print:hidden">
        Constancia calcula cifras de documentos que tú subes. No verifica con el banco ni con el IMSS, y no califica a nadie.
      </footer>
    </div>
  );
}
