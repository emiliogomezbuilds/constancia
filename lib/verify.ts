// Verification step. Whatever produced a candidate row (parser or AI), a row only counts if the
// source text the worker supplied contains a line with that exact amount AND that exact date.
// This stops an AI hallucination or a prompt injection from inventing income. It checks
// consistency with the supplied text, NOT that the text is a genuine bank document.
import { datesIn } from "@/lib/dates";
import type { Row } from "@/lib/parse";
import { amountsIn } from "@/lib/parse";

export type Candidate = { date: string; amount: number; line?: number; method?: "parser" | "ai" };

function lineHasAmount(line: string, amount: number): boolean {
  const cents = Math.round(amount * 100);
  // Compare as numbers so "12800", "12,800.00" and "$12,800" all match 12800.00.
  const tokens = amountsIn(line).map((a) => Math.round(a.value * 100));
  if (tokens.includes(cents)) return true;
  // CSV cells may hold bare numbers like 12800 with no decimals or sign: accept an exact bare token.
  const bare = new RegExp(`(?<![\\d.])(?<!\\d,)${String(amount).replace(".", "\\.")}(?!\\d|\\.\\d|,\\d{3}(?!\\d))`);
  return bare.test(line);
}

export function sourceHashInput(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

export function verifyRows(
  candidates: Candidate[],
  sourceText: string,
  now: Date = new Date(),
): { verified: Row[]; rejected: number } {
  void now;
  const lines = sourceText.split(/\r?\n/);
  const defaultYear = (() => {
    const m = sourceText.match(/\b(20\d{2})\b/);
    return m ? Number(m[1]) : new Date().getUTCFullYear();
  })();
  const used = new Set<number>();
  const verified: Row[] = [];
  let rejected = 0;

  for (const c of candidates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date) || !(c.amount > 0)) {
      rejected++;
      continue;
    }
    const order: number[] = [];
    if (c.line && c.line >= 1 && c.line <= lines.length) order.push(c.line - 1);
    for (let i = 0; i < lines.length; i++) if (i !== (c.line ?? 0) - 1) order.push(i);

    let hit = -1;
    for (const i of order) {
      if (used.has(i)) continue;
      const line = lines[i];
      if (!line.trim()) continue;
      const hasDate = datesIn(line, defaultYear).some((d) => d.iso === c.date);
      if (hasDate && lineHasAmount(line, c.amount)) {
        hit = i;
        break;
      }
    }
    if (hit < 0) {
      rejected++;
      continue;
    }
    used.add(hit);
    verified.push({
      id: `l${hit + 1}`,
      date: c.date,
      amount: Math.round(c.amount * 100) / 100,
      description: lines[hit].replace(/\s+/g, " ").replace(/[^\p{L}\p{N} .,&/#-]/gu, "").trim().slice(0, 60),
      line: hit + 1,
      method: c.method ?? "parser",
    });
  }
  return { verified, rejected };
}
