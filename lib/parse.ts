// Deterministic statement reader. No AI. It looks for deposits (abonos) in pasted text or a CSV
// and returns candidate rows. Every row is later checked again by verifyRows() against the
// source text, so what the worker sees is always traceable to a line they supplied.
import { datesIn } from "@/lib/dates";
import { todayMx } from "@/lib/validate";

export const MAX_CHARS = 40_000;
export const MAX_LINES = 1_500;
export const MAX_AMOUNT = 10_000_000;

export type Row = {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // pesos, > 0
  description: string;
  line: number; // 1-based line in the source text
  method: "parser" | "ai";
  ambiguous?: boolean; // more than one amount on the line: the first one was used, please check
};

export type ParseResult = {
  rows: Row[];
  skipped: number; // lines that looked like movements but were not clear deposits or were out of range
  mode: "csv" | "text";
  warnings: string[];
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const AMOUNT_RE = /(?<![\d.,])(\$\s?)?(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+(?:\.\d{2})?)(?![\d,]|\.\d)/g;
const CREDIT_RE = /(abono|dep[oó]sito|recibid[oa]|spei\s*recib|transferencia\s*recib|pago\s*recib|n[oó]mina|ingreso|\bcr\b)/i;
const DEBIT_RE = /(cargo|retiro|compra|comisi[oó]n|pago\s*(?:a\s|de\s*servicio|tarjeta)|enviad[oa]|spei\s*env|transferencia\s*env|domicili|disposici[oó]n|d[eé]bito|\biva\b)/i;

export function parseMoney(raw: string): number | null {
  const s = raw.trim().replace(/^\$\s?/, "").replace(/,/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Amount tokens in a text fragment: must have decimals, a $ sign or a thousands comma. */
export function amountsIn(fragment: string): Array<{ value: number; start: number; negative: boolean }> {
  const out: Array<{ value: number; start: number; negative: boolean }> = [];
  for (const m of fragment.matchAll(AMOUNT_RE)) {
    const hasMarker = !!m[1] || m[2].includes(",") || m[2].includes(".");
    if (!hasMarker) continue;
    const value = parseMoney(m[2]);
    if (value === null) continue;
    const before = fragment.slice(Math.max(0, m.index! - 2), m.index!);
    out.push({ value, start: m.index!, negative: /-\s?$|\($/.test(before) });
  }
  return out;
}

function splitCsvLine(line: string, d: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (ch === d && !q) {
      cells.push(cur);
      cur = "";
    } else cur += ch;
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

function detectDefaultYear(text: string, now: Date): number {
  const m = text.match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : Number(todayMx(now).slice(0, 4));
}

function inRange(date: string, amount: number, now: Date): boolean {
  const today = todayMx(now);
  const floor = `${Number(today.slice(0, 4)) - 3}${today.slice(4)}`;
  return date <= today && date >= floor && amount > 0 && amount <= MAX_AMOUNT;
}

function clean(s: string): string {
  return s.replace(/\s+/g, " ").replace(/[^\p{L}\p{N} .,&/#-]/gu, "").trim().slice(0, 60);
}

export function parseStatement(text: string, now: Date = new Date()): ParseResult {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).slice(0, MAX_LINES);
  const defaultYear = detectDefaultYear(text, now);
  const rows: Row[] = [];
  let skipped = 0;

  // ---- CSV mode: a header row with a date column and money columns
  const headerIdx = lines.findIndex((l) => {
    const n = norm(l);
    return /fecha/.test(n) && /(abono|deposito|credito|ingreso|monto|importe)/.test(n) && /[,;\t|]/.test(l);
  });
  if (headerIdx >= 0) {
    const delim = [",", ";", "\t", "|"].sort((a, b) => lines[headerIdx].split(b).length - lines[headerIdx].split(a).length)[0];
    const head = splitCsvLine(lines[headerIdx], delim).map(norm);
    const col = (re: RegExp) => head.findIndex((h) => re.test(h));
    const cDate = col(/fecha/);
    const cDesc = col(/(concepto|descripcion|detalle|movimiento)/);
    const cCredit = col(/(abono|deposito|credito|ingreso)/);
    const cAmount = col(/(monto|importe)/);
    const cType = col(/tipo/);
    for (let i = headerIdx + 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cells = splitCsvLine(lines[i], delim);
      const date = datesIn(cells[cDate] ?? "", defaultYear)[0]?.iso;
      let amount: number | null = null;
      if (cCredit >= 0 && cells[cCredit]) amount = parseMoney(cells[cCredit]);
      else if (cAmount >= 0 && cells[cAmount]) {
        const v = parseMoney(cells[cAmount]);
        const type = cType >= 0 ? norm(cells[cType]) : "";
        amount = v !== null && v > 0 && !/(cargo|retiro|debito)/.test(type) ? v : null;
      }
      if (!date || amount === null) {
        skipped++;
        continue;
      }
      if (!inRange(date, amount, now)) {
        skipped++;
        continue;
      }
      rows.push({
        id: `l${i + 1}`,
        date,
        amount,
        description: clean(cDesc >= 0 ? cells[cDesc] ?? "" : ""),
        line: i + 1,
        method: "parser",
      });
    }
    if (rows.length === 0) warnings.push("Se reconoció una tabla CSV pero no se encontraron depósitos con fecha válida.");
    return { rows, skipped, mode: "csv", warnings };
  }

  // ---- Free-text mode: one movement per line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const dates = datesIn(line, defaultYear);
    if (dates.length === 0) continue;
    let rest = line;
    for (const d of [...dates].reverse()) rest = rest.slice(0, d.start) + " ".repeat(d.end - d.start) + rest.slice(d.end);
    const amts = amountsIn(rest);
    if (amts.length === 0) continue;
    const isCredit = CREDIT_RE.test(line);
    const isDebit = DEBIT_RE.test(line);
    if (!isCredit || (isDebit && !/abono/i.test(line))) {
      if (isCredit || isDebit) skipped++;
      continue;
    }
    const first = amts[0];
    if (first.negative || !inRange(dates[0].iso, first.value, now)) {
      skipped++;
      continue;
    }
    rows.push({
      id: `l${i + 1}`,
      date: dates[0].iso,
      amount: first.value,
      description: clean(rest.replace(AMOUNT_RE, " ")),
      line: i + 1,
      method: "parser",
      ambiguous: amts.length > 1,
    });
  }
  if (rows.length === 0) warnings.push("No se detectaron depósitos. Revisa que el texto tenga fecha y monto en cada línea.");
  if (rows.some((r) => r.ambiguous)) warnings.push("En algunas líneas hay más de un monto (por ejemplo el saldo). Se tomó el primero; revisa esas filas.");
  return { rows, skipped, mode: "text", warnings };
}
