// Input validation (Security Floor #4): length limits and type checks on every form.
// Nothing goes raw from a text box into the database.

export function text(
  v: FormDataEntryValue | null,
  min: number,
  max: number,
): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return s.length >= min && s.length <= max ? s : null;
}

export function oneOf<T extends string>(
  v: FormDataEntryValue | null,
  allowed: readonly T[],
): T | null {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

// Today's date (YYYY-MM-DD) for the business owner in Mexico City, NOT the server's UTC date.
// Bug found in live test: the backup form defaulted to tomorrow every evening in Mexico.
export function todayMx(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isoDate(v: FormDataEntryValue | null, now: Date = new Date()): string | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v + "T00:00:00Z");
  // Reject impossible dates such as 2026-02-31 (JS would silently roll them over).
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null;
  return v <= todayMx(now) ? v : null;
}
