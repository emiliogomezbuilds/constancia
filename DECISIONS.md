# DECISIONS, Constancia (Week 9, Business Bending)

## Session 1 (2026-10-11): packet, then build
- **Slice:** the records layer of the team Blueprint. Role USER. A worker turns a bank statement they already have into monthly figures with the source shown, and decides who sees it. Not a CV builder, not a job board.
- **Packet before code:** `docs/PACKET.md` is the first commit with my own work (b03c609). Every code commit comes after it.
- **Name:** Constancia. New repo, new Supabase project, same proven stack as Resguardo.
- **Shadow clause by design:** the schema has no score, grade, rating or label column and the log stores no IP or browser. `isNeutral()` blocks rating or recommendation wording in any AI sentence, and `scripts/verify.ts` scans the whole source tree for those words and the schema for those columns.
- **Honest label everywhere:** an uploaded document is the worker's claim. Every figure and every certificate says "Documento subido por la persona, sin verificación de terceros".
- **AI is real but boxed in:** Gemini (free tier) only proposes candidate deposit rows and, optionally, words figures that code already computed. Every proposed row must appear in the worker's own text (amount and date on a distinct line) or it is dropped. The AI never calculates and never grades.
- **AI is opt-in, with its own consent:** the free tier may use submitted content to improve Google products, so the worker ticks a separate box. Consent is stored per purpose with a text version.
- **Numbers come from code:** integer-cents arithmetic, empty months count as zero and are never hidden, the lowest month is always shown.
- **Certificates:** unguessable 48-hex token, 7/30/90 day expiry, revocable, visit log with time only. A database trigger lets a certificate be changed only to revoke it. The public lookup is one security-definer function.
- **Storage minimum:** only monthly figures and a fingerprint of the text are saved, never the uploaded text.
- **Known limit I chose:** no PDF reading. Real statements are often PDFs, so a worker must paste text or export a CSV.

## Session 2 (2026-10-11): deploy and test
- **Deploy 1:** Vercel Hobby + new Supabase project (RLS on all four tables) + Google OAuth. Live at https://constancia-bice.vercel.app.
- **Mechanical pass, bugs found on the live URL and fixed (each has a regression check in `scripts/verify.ts` where it is testable offline):**
  1. The AI call returned "not available" with no reason. Added the HTTP status to the message (32df63a). The status was 404: Google now limits `gemini-2.5-*` models to accounts that used them before. Default model changed to `gemini-3.5-flash-lite` (8824cbf). The real call then worked, and the verifier kept the row that matches the text and dropped the one that does not.
  2. Every row showed "Revisar monto" just because the line had a balance column. Now only lines with three or more amounts are flagged (f630f31).
  3. Saving a CSV was rejected by the verification step: an unquoted amount right after a comma (`,3100.50,`) was not recognized. Fixed, with a regression case using the exact file that failed (d0eaefe).
- **Persona test (Marcos, 34, delivery worker):** played by me on the live app and written up with the build assistant. The worst confusion was my own question "how exactly can I open a constancia": the record page showed only a `/c/...` fragment with no link and no button. Fixes chosen, worst first:
  1. WORST: full copyable certificate link with "Copiar enlace" and "Abrir constancia" buttons (3756c06).
  2. Plain three-step explanation on the upload page, because "do I put anything in the boxes?" had no answer on screen (3756c06).
  3. Optional title now says what happens if it is empty (42e0f50). Single-month records no longer read "septiembre 2026 a septiembre 2026" (3756c06).
- **Known limits (not fixed, written down):** PDFs are not read; reviewing 52 rows means unticking relatives one by one with no "untick all" and no hint; the dashboard and record pages do not explain themselves the way the upload page now does; "Huella del texto" is jargon; the "Simulado" label is not explained on the record page; no real delivery worker has used it, so the persona log is a floor.

## Session Close
- **What exists:** live app with sign-in, consent, paste/CSV/TXT/sample input, optional Gemini reading with verification, review step, monthly figures, optional wording, certificate create/open/revoke with visit log, delete one record or all data, privacy page. 56 offline checks pass (`npm run verify`).
- **What changed my mind:** I expected the hard part to be reading messy statements. It was not. The hard part was that a correct safety check can still block an honest user: the save step rejected a real CSV row because its own check was stricter than the parser, and only a live upload found it.
- **What I would do next, in order:** (1) put it in front of one real worker and watch where they stop; (2) accept PDF statements; (3) an IMSS weeks statement as a second document type; (4) ask one landlord or lender whether they would read this page at all, because that is the open bet in the PACKET.
- **What I would not do:** add any score, grade or "consistency" label, add employer-side search, or call anything verified when it is self-supplied.
