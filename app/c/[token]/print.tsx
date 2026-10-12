"use client";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return <Button className="mt-4 print:hidden" variant="outline" onClick={() => window.print()}>Imprimir o guardar PDF</Button>;
}
