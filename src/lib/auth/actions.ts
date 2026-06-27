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

const VERIFY = ["verified", "disputed", "unverified"] as const;

export async function verifyNeed(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const verification = String(formData.get("verification") ?? "");
  if (!id || !VERIFY.includes(verification as (typeof VERIFY)[number])) return;

  const supabase = await createClient();
  // A DB trigger rejects non-coordinators and stamps verified_by/at.
  await supabase
    .from("needs")
    .update({ verification: verification as (typeof VERIFY)[number] })
    .eq("id", id);
  revalidatePath("/coordinador");
}

export async function assignNeed(formData: FormData) {
  const needId = String(formData.get("need_id") ?? "");
  const responderId = String(formData.get("responder_id") ?? "");
  if (!needId || !responderId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // RLS allows the insert only for coordinators with assigned_by = self.
  // Re-assigning the same responder updates the existing row.
  await supabase
    .from("assignments")
    .upsert(
      { need_id: needId, responder_id: responderId, assigned_by: user.id },
      { onConflict: "need_id,responder_id" },
    );
  revalidatePath("/coordinador");
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
