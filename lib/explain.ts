import { monthLabel } from "@/lib/dates";
import { money, type Figures } from "@/lib/compute";
import { SELF_SUPPLIED_LABEL } from "@/lib/wording";

function d(iso: string): string {
  return `${+iso.slice(8, 10)} de ${monthLabel(iso.slice(0, 7))}`;
}

/** Deterministic wording of the figures. Always available, never needs AI. */
export function templateExplanation(f: Figures): string {
  const lowestNote =
    f.minAmount === 0 ? `El mes de ${monthLabel(f.minMonth)} no tuvo depósitos detectados.` : `El mes más bajo fue ${monthLabel(f.minMonth)}, con ${money(f.minAmount)}.`;
  return [
    `Entre el ${d(f.periodStart)} y el ${d(f.periodEnd)} (${f.monthsCovered} ${f.monthsCovered === 1 ? "mes" : "meses"}) se detectaron ${f.deposits} depósitos que suman ${money(f.total)}.`,
    `El promedio mensual es ${money(f.avgMonthly)}. ${lowestNote}`,
    `El primer y el último mes pueden estar incompletos si el documento no cubre el mes entero.`,
    `${SELF_SUPPLIED_LABEL}.`,
  ].join(" ");
}
