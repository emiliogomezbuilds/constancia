// Invented sample statement for demos and tests. Every name is fake and marked DEMO.
// Real people's bank data never goes into demos (Security Floor #5).
import { addMonths } from "@/lib/dates";

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Six full months ending the month before `todayIso`. Deterministic, so tests are stable. */
export function sampleStatement(todayIso: string): string {
  const rnd = lcg(20261011);
  const first = addMonths(todayIso.slice(0, 7) + "-01", -6);
  const out: string[] = [
    "ESTADO DE CUENTA DE EJEMPLO (INVENTADO) - Cliente: MARCOS DEMO",
    "FECHA       CONCEPTO                                   MONTO       SALDO",
  ];
  let balance = 4200;
  for (let k = 0; k < 6; k++) {
    const start = addMonths(first, k);
    const y = +start.slice(0, 4);
    const m = +start.slice(5, 7);
    const lowMonth = k === 2; // one thin month, to show the lowest-month figure
    const weeks = lowMonth ? 3 : 4;
    for (let w = 0; w < weeks; w++) {
      const day = 3 + w * 7;
      const amount = Math.round((lowMonth ? 2300 : 2900 + rnd() * 900) * 100) / 100;
      balance += amount;
      const dd = String(day).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      out.push(`${dd}/${mm}/${y} ABONO SPEI RECIBIDO APP REPARTO DEMO UNO ${fmt(amount)} ${fmt(balance)}`);
      const second = Math.round((600 + rnd() * 500) * 100) / 100;
      balance += second;
      out.push(`${String(day + 1).padStart(2, "0")}/${mm}/${y} ABONO SPEI RECIBIDO APP REPARTO DEMO DOS ${fmt(second)} ${fmt(balance)}`);
      const spend = Math.round((900 + rnd() * 700) * 100) / 100;
      balance -= spend;
      out.push(`${String(day + 2).padStart(2, "0")}/${mm}/${y} COMPRA TIENDA DEMO -${fmt(spend)} ${fmt(balance)}`);
    }
    // a transfer from a relative: the worker can untick it, it is not income
    out.push(`15/${String(m).padStart(2, "0")}/${y} ABONO SPEI RECIBIDO HERMANA DEMO 1,500.00 ${fmt(balance + 1500)}`);
    balance += 1500;
    out.push(`28/${String(m).padStart(2, "0")}/${y} CARGO RENTA CUARTO DEMO -4,500.00 ${fmt(balance - 4500)}`);
    balance -= 4500;
  }
  return out.join("\n");
}
