"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CONSENT_VERSION, hasConsent, requireUser } from "@/lib/session";
import { oneOf, text, todayMx } from "@/lib/validate";
import { MAX_CHARS, parseStatement, type Row } from "@/lib/parse";
import { sourceHashInput, verifyRows } from "@/lib/verify";
import { computeFigures, type Figures } from "@/lib/compute";
import { recordFigures } from "@/lib/figures";
import { AI_MAX_CHARS, explainFiguresAI, extractDepositsAI } from "@/lib/ai";
import { sampleStatement } from "@/lib/sample";
import { monthLabel } from "@/lib/dates";
import { templateExplanation } from "@/lib/explain";

const MAX_FILE_BYTES = 200_000;
const KINDS = ["estado_cuenta", "imss", "otro"] as const;

export type Analysis = {
  sourceText: string;
  sourceName: string | null;
  sourceKind: (typeof KINDS)[number];
  isSample: boolean;
  rows: Row[];
  skipped: number;
  warnings: string[];
  aiConsent: boolean;
  aiNote: string | null;
};
export type AnalyzeState = { error?: string; analysis?: Analysis };

const sha256 = (s: string) => createHash("sha256").update(sourceHashInput(s)).digest("hex");

// ------------------------------------------------------------------ 1. read the document
export async function analyzeAction(_prev: AnalyzeState, formData: FormData): Promise<AnalyzeState> {
  const { user } = await requireUser();
  void user;

  if (formData.get("consent_process") !== "on") {
    return { error: "Para leer tu documento necesitamos tu permiso. Marca la casilla de abajo." };
  }
  const aiConsent = formData.get("consent_ai") === "on";
  const kind = oneOf(formData.get("source_kind"), KINDS) ?? "estado_cuenta";

  let sourceText = "";
  let sourceName: string | null = null;
  let isSample = false;

  if (formData.get("use_sample") === "1") {
    sourceText = sampleStatement(todayMx());
    sourceName = "Estado de cuenta de ejemplo (inventado)";
    isSample = true;
  } else {
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE_BYTES) return { error: "El archivo es muy grande (máximo 200 KB). Pega solo el texto de los movimientos." };
      if (!/\.(csv|txt)$/i.test(file.name)) return { error: "Por ahora solo aceptamos archivos .csv o .txt. También puedes pegar el texto." };
      sourceText = await file.text();
      sourceName = file.name.replace(/[^\p{L}\p{N} ._-]/gu, "").slice(0, 120) || null;
    } else {
      sourceText = typeof formData.get("text") === "string" ? (formData.get("text") as string) : "";
    }
  }
  sourceText = sourceText.replace(/\u0000/g, "").trim();
  if (sourceText.length < 20) return { error: "No encontramos texto. Pega los movimientos de tu estado de cuenta o sube un .csv." };
  if (sourceText.length > MAX_CHARS) return { error: `El texto es muy largo (máximo ${MAX_CHARS.toLocaleString("es-MX")} caracteres). Pega solo los últimos meses.` };

  const parsed = parseStatement(sourceText);
  let rows: Row[] = parsed.rows;
  const warnings = [...parsed.warnings];
  let aiNote: string | null = null;

  if (aiConsent) {
    if (sourceText.length > AI_MAX_CHARS) {
      aiNote = `La lectura con IA acepta hasta ${AI_MAX_CHARS.toLocaleString("es-MX")} caracteres. Se usaron solo las reglas.`;
    } else {
      const ai = await extractDepositsAI(sourceText);
      if (ai.ok) {
        const { verified, rejected } = verifyRows(ai.value, sourceText);
        const have = new Set(rows.map((r) => r.id));
        const extra = verified.filter((r) => !have.has(r.id));
        rows = [...rows, ...extra];
        aiNote = `La IA propuso ${ai.value.length} filas; ${verified.length} coinciden con tu texto${rejected ? ` y ${rejected} se descartaron porque no aparecen en él` : ""}. Se sumaron ${extra.length} filas nuevas.`;
      } else if (ai.error === "no_key") {
        aiNote = "La lectura con IA no está configurada en este servidor. Se usaron solo las reglas.";
      } else {
        aiNote = `La lectura con IA no estuvo disponible ahora${ai.status ? ` (código ${ai.status})` : ai.error === "bad_output" ? " (respuesta vacía)" : " (sin respuesta)"}. Se usaron solo las reglas.`;
      }
    }
  }

  rows.sort((a, b) => (a.date === b.date ? a.line - b.line : a.date < b.date ? -1 : 1));
  if (rows.length === 0) {
    return { error: warnings[0] ?? "No se detectaron depósitos en el texto." };
  }
  return { analysis: { sourceText, sourceName, sourceKind: kind, isSample, rows, skipped: parsed.skipped, warnings, aiConsent, aiNote } };
}

// ------------------------------------------------------------------ 2. save the record
export type SaveState = { error?: string };

export async function saveRecordAction(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const { supabase } = await requireUser();

  if (formData.get("consent_process") !== "on") return { error: "Falta tu permiso para procesar el documento." };
  const aiConsent = formData.get("consent_ai") === "on";

  // Not text(): that helper flattens newlines, and verification is line-based.
  const rawSource = formData.get("source_text");
  const sourceText = typeof rawSource === "string" && rawSource.length >= 20 && rawSource.length <= MAX_CHARS ? rawSource : null;
  const kind = oneOf(formData.get("source_kind"), KINDS);
  if (!sourceText || !kind) return { error: "Faltan datos del documento. Vuelve a cargarlo." };
  const sourceNameRaw = formData.get("source_name");
  const sourceName = typeof sourceNameRaw === "string" && sourceNameRaw ? sourceNameRaw.replace(/[\u0000-\u001f]/g, " ").slice(0, 120) : null;
  const isSample = formData.get("is_sample") === "1";

  let all: Row[];
  try {
    const parsed = JSON.parse(String(formData.get("rows") ?? "[]"));
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 1500) throw new Error("rows");
    all = parsed.map((r) => ({
      id: String(r.id), date: String(r.date), amount: Number(r.amount), description: String(r.description ?? ""),
      line: Number(r.line), method: r.method === "ai" ? "ai" : "parser",
    }));
  } catch {
    return { error: "No pudimos leer las filas. Vuelve a cargar el documento." };
  }

  const included = new Set(formData.getAll("include").map(String));
  const chosen = all.filter((r) => included.has(r.id));
  if (chosen.length === 0) return { error: "Marca al menos un depósito que sea ingreso." };

  // Re-check every chosen row against the source text, server side. The browser is never trusted.
  const check = verifyRows(chosen.map((r) => ({ date: r.date, amount: r.amount, line: r.line, method: r.method })), sourceText);
  if (check.rejected > 0) return { error: "Algunas filas no coinciden con el texto del documento. Vuelve a cargarlo." };

  let fig: Figures;
  try {
    fig = computeFigures(check.verified);
  } catch (e) {
    return { error: e instanceof Error && e.message === "span_too_long" ? "El documento cubre más de 36 meses. Usa un periodo más corto." : "No se pudieron calcular las cifras." };
  }

  const title = text(formData.get("title"), 1, 80) ?? `Ingresos ${monthLabel(fig.months[0].month)} a ${monthLabel(fig.months[fig.months.length - 1].month)}`;
  const method = check.verified.some((r) => r.method === "ai") ? "ai_verified" : "parser";

  const { data, error } = await supabase
    .from("income_records")
    .insert({
      title, source_kind: kind, source_name: sourceName, source_hash: sha256(sourceText), reading_method: method,
      is_sample: isSample, months: fig.months, months_covered: fig.monthsCovered,
      deposits_included: chosen.length, deposits_detected: all.length,
      total_amount: fig.total, avg_monthly: fig.avgMonthly, min_month: fig.minMonth, min_amount: fig.minAmount,
      period_start: fig.periodStart, period_end: fig.periodEnd,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "No se pudo guardar. Intenta de nuevo." };

  await supabase.from("consents").insert([
    { purpose: "process_document", granted: true, text_version: CONSENT_VERSION },
    { purpose: "ai_reading", granted: aiConsent, text_version: CONSENT_VERSION },
  ]);
  revalidatePath("/dashboard");
  redirect(`/records/${data.id}`);
}

// ------------------------------------------------------------------ 3. certificates
export async function createCertificateAction(formData: FormData) {
  const { supabase } = await requireUser();
  const recordId = text(formData.get("record_id"), 36, 36);
  const days = oneOf(formData.get("days"), ["7", "30", "90"] as const);
  if (!recordId || !/^[0-9a-f-]{36}$/.test(recordId) || !days) redirect("/dashboard");
  const expires = new Date(Date.now() + Number(days) * 86_400_000).toISOString();
  await supabase.from("certificates").insert({ record_id: recordId, expires_at: expires });
  revalidatePath(`/records/${recordId}`);
  redirect(`/records/${recordId}`);
}

export async function revokeCertificateAction(formData: FormData) {
  const { supabase } = await requireUser();
  const id = text(formData.get("certificate_id"), 36, 36);
  const recordId = text(formData.get("record_id"), 36, 36);
  if (!id || !/^[0-9a-f-]{36}$/.test(id) || !recordId || !/^[0-9a-f-]{36}$/.test(recordId)) redirect("/dashboard");
  await supabase.from("certificates").update({ revoked_at: new Date().toISOString() }).eq("id", id).is("revoked_at", null);
  revalidatePath(`/records/${recordId}`);
  redirect(`/records/${recordId}`);
}

// ------------------------------------------------------------------ 4. deletion ("delete my data")
export async function deleteRecordAction(formData: FormData) {
  const { supabase } = await requireUser();
  const id = text(formData.get("record_id"), 36, 36);
  if (id && /^[0-9a-f-]{36}$/.test(id)) await supabase.from("income_records").delete().eq("id", id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteAllDataAction() {
  const { supabase, user } = await requireUser();
  await supabase.from("income_records").delete().eq("user_id", user.id); // certificates and views cascade
  await supabase.from("consents").delete().eq("user_id", user.id);
  revalidatePath("/dashboard");
  redirect("/dashboard?deleted=1");
}

// ------------------------------------------------------------------ 5. optional AI wording of the figures
export type ExplainState = { text?: string; source?: "ia" | "plantilla"; note?: string };

export async function explainAction(_prev: ExplainState, formData: FormData): Promise<ExplainState> {
  const { supabase } = await requireUser();
  const id = text(formData.get("record_id"), 36, 36);
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) return { note: "Registro no válido." };
  const { data: r } = await supabase.from("income_records").select("*").eq("id", id).maybeSingle();
  if (!r) return { note: "No encontramos ese registro." };
  const fig = recordFigures(r);
  if (!(await hasConsent(supabase, "ai_reading"))) {
    return { text: templateExplanation(fig), source: "plantilla", note: "No diste permiso para IA, así que usamos el texto fijo." };
  }
  const ai = await explainFiguresAI(fig);
  if (ai.ok) return { text: ai.value, source: "ia" };
  return { text: templateExplanation(fig), source: "plantilla", note: "La IA no estuvo disponible o su texto no pasó el filtro; usamos el texto fijo." };
}

