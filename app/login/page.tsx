"use client";
import { createClient } from "@/lib/supabase/client";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";

export default function Login() {
  async function go() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } });
  }
  return (
    <Shell>
      <h1 className="text-2xl font-bold">Entrar</h1>
      <p className="mt-2 text-slate-700">Usamos tu cuenta de Google solo para saber quién eres. No leemos tu correo ni tus archivos.</p>
      <Button className="mt-6" size="lg" onClick={go}>Continuar con Google</Button>
    </Shell>
  );
}
