"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      /* clipboard blocked: the link is still selectable and openable */
    }
  }
  return (
    <div className="mt-2 space-y-2">
      <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace de la constancia" className="w-full rounded border bg-slate-50 p-2 font-mono text-xs" />
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={copy}>{done ? "Copiado" : "Copiar enlace"}</Button>
        <Button asChild size="sm" variant="outline"><a href={url} target="_blank" rel="noopener noreferrer">Abrir constancia</a></Button>
      </div>
    </div>
  );
}
