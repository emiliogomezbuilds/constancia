import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Every protected page goes through here. No session -> /login.
// RLS still enforces ownership in the database, this is only the friendly redirect.
export async function requireUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  return { supabase, user: auth.user };
}

export type Purpose = "process_document" | "ai_reading";

/** Latest recorded answer for a purpose. No row means "never granted". */
export async function hasConsent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  purpose: Purpose,
): Promise<boolean> {
  const { data } = await supabase
    .from("consents")
    .select("granted")
    .eq("purpose", purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.granted === true;
}

export const CONSENT_VERSION = "2026-10-v1";
