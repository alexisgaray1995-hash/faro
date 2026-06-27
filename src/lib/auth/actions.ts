"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safeNext";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/acceso?error=1&next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

const SETTABLE = ["in_progress", "resolved", "open"] as const;

export async function updateNeedStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !SETTABLE.includes(status as (typeof SETTABLE)[number])) return;

  const supabase = await createClient();
  // RLS already restricts updates to active responders; this only narrows
  // which columns a responder may touch from the dashboard.
  await supabase
    .from("needs")
    .update({ status: status as (typeof SETTABLE)[number] })
    .eq("id", id);
  revalidatePath("/panel");
}
