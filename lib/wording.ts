// Shadow clause, enforced in code: nothing the product says about a person may rate or label them.
// isNeutral() gates every AI-written sentence before it reaches the screen, and scripts/verify.ts
// scans the whole source tree for these words. This file is the only place allowed to list them.

export const BANNED_PATTERNS: RegExp[] = [
  /puntaje/i,
  /calificaci[oó]n/i,
  /\bscore\b/i,
  /\brating\b/i,
  /confiab/i,
  /riesgo\s+crediticio/i,
  /buen[ao]?\s+(historial|perfil|cliente|pagador)/i,
  /mal[ao]?\s+(historial|perfil|cliente|pagador)/i,
  /\b(desempleable|inestable|solvente|moroso)\b/i,
  /\brecomend/i,
  /\baprobad/i,
  /\bapto\b/i,
];

export function isNeutral(text: string): boolean {
  return !BANNED_PATTERNS.some((re) => re.test(text));
}

export const SELF_SUPPLIED_LABEL = "Documento subido por la persona, sin verificación de terceros";
export const ACCEPTOR_LIMIT =
  "Constancia no puede controlar lo que hace con este documento quien lo lee. Este documento no es una calificación ni una recomendación.";
