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

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const next = safeNext(formData.get("next"));

  // Fast path: minimal validation, the rest is enforced by Supabase + the DB.
  if (!email || password.length < 8) {
    redirect(`/registro?error=1&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // handle_new_user() reads display_name and creates a 'volunteer' profile.
    options: { data: { display_name: displayName || undefined } },
  });
  if (error) {
    redirect(`/registro?error=1&next=${encodeURIComponent(next)}`);
  }
  // If the project has email confirmation off, signUp returns a live session →
  // straight into the panel. If on, there's no session yet → tell them to check
  // their email. ponytail: no custom email flow; flip the Supabase setting for
  // disaster-speed signups.
  if (data.session) redirect(next);
  redirect("/acceso?check=1");
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
