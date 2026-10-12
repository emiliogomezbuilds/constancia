// Date helpers shared by the parser and the verifier. Pure functions, no I/O.

const MONTHS: Record<string, number> = {
  ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4, may: 5, mayo: 5,
  jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8, sep: 9, sept: 9, set: 9, septiembre: 9,
  oct: 10, octubre: 10, nov: 11, noviembre: 11, dic: 12, diciembre: 12,
};
const MON_ALT = "ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:t(?:iembre)?)?|set(?:iembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?";

export const ISO_RE = /\b(20\d{2})-(\d{2})-(\d{2})\b/g;
export const DMY_RE = /\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2}|\d{2})\b/g;
export const DMON_RE = new RegExp(`\\b(\\d{1,2})[\\s/.-]*(${MON_ALT})\\.?(?:[\\s/.,-]*(20\\d{2}|\\d{2})\\b)?`, "gi");

/** Real calendar date check: rejects 2026-02-31 instead of letting JS roll it over. */
export function validIso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const iso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const t = new Date(iso + "T00:00:00Z");
  return Number.isNaN(t.getTime()) || t.toISOString().slice(0, 10) !== iso ? null : iso;
}

function year4(y: string): number {
  const n = Number(y);
  return y.length === 2 ? 2000 + n : n;
}

export type DateHit = { iso: string; start: number; end: number };

/** All dates found in a line, with their positions so amounts can be searched outside them. */
export function datesIn(line: string, defaultYear: number): DateHit[] {
  const hits: DateHit[] = [];
  const taken: Array<[number, number]> = [];
  const overlaps = (s: number, e: number) => taken.some(([a, b]) => s < b && e > a);
  const push = (iso: string | null, s: number, e: number) => {
    if (iso && !overlaps(s, e)) {
      hits.push({ iso, start: s, end: e });
      taken.push([s, e]);
    }
  };

  for (const m of line.matchAll(ISO_RE)) push(validIso(+m[1], +m[2], +m[3]), m.index!, m.index! + m[0].length);
  for (const m of line.matchAll(DMY_RE)) push(validIso(year4(m[3]), +m[2], +m[1]), m.index!, m.index! + m[0].length);
  for (const m of line.matchAll(DMON_RE)) {
    const mon = MONTHS[m[2].toLowerCase()];
    if (!mon) continue;
    const y = m[3] ? year4(m[3]) : defaultYear;
    push(validIso(y, mon, +m[1]), m.index!, m.index! + m[0].length);
  }
  return hits.sort((a, b) => a.start - b.start);
}

export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

/** Inclusive list of YYYY-MM from a to b. */
export function monthRange(a: string, b: string): string[] {
  const out: string[] = [];
  let y = +a.slice(0, 4);
  let m = +a.slice(5, 7);
  const ey = +b.slice(0, 4);
  const em = +b.slice(5, 7);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export const MONTH_NAMES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function monthLabel(ym: string): string {
  return `${MONTH_NAMES_ES[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;
}

export function addMonths(iso: string, delta: number): string {
  const y = +iso.slice(0, 4);
  const m = +iso.slice(5, 7) - 1 + delta;
  const ny = y + Math.floor(m / 12);
  const nm = ((m % 12) + 12) % 12;
  return `${ny}-${String(nm + 1).padStart(2, "0")}-${iso.slice(8, 10)}`;
}
