"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

// Two-step verification (TOTP) for responders. Opt-in: once a verified factor
// exists, /coordinador redirects here until the session reaches aal2 — so a
// coordinator confirms a code each login, but nobody is locked out before they
// choose to enroll (deliberate: don't block a coordinator mid-disaster).
//
// One client component drives the whole flow so the QR/secret only ever live in
// the browser. listFactors + getAAL decide which step to show.
// ponytail: a single TOTP factor is enough; no SMS/recovery-code UI. Add a
// recovery path if coordinators start getting locked out by lost phones.
type Step = "loading" | "enroll" | "verify_enroll" | "challenge" | "done";

export function Mfa() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Decide the starting step from the current factors + assurance level.
  const refresh = useCallback(async () => {
    const supabase = createClient();
    const [{ data: factors }, { data: aal }] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    const verified = factors?.totp?.find((f) => f.status === "verified");
    if (!verified) {
      setStep("enroll");
      return;
    }
    setFactorId(verified.id);
    // Has a factor but the session hasn't proven it yet → ask for a code.
    setStep(aal?.currentLevel === "aal2" ? "done" : "challenge");
  }, []);

  useEffect(() => {
    // Async data load — setState lands after the awaits, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function startEnroll() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Faro ${new Date().toISOString().slice(0, 10)}`,
    });
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "No se pudo iniciar la activación.");
      return;
    }
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStep("verify_enroll");
  }

  async function submitCode() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (chErr || !ch) {
      setBusy(false);
      setError(chErr?.message ?? "No se pudo verificar. Intenta de nuevo.");
      return;
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: ch.id,
      code: code.trim(),
    });
    setBusy(false);
    if (vErr) {
      setError(vErr.message ?? "Código incorrecto.");
      return;
    }
    setCode("");
    setStep("done");
    router.refresh();
  }

  async function unenroll() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setQr("");
    setSecret("");
    setStep("enroll");
    router.refresh();
  }

  if (step === "loading") {
    return <p className="text-muted">Cargando…</p>;
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      {error && (
        <p className="mb-3 rounded-xl border border-help/40 bg-help/10 px-3 py-2 text-sm text-foreground">
          {error}
        </p>
      )}

      {step === "enroll" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Añade una segunda barrera con una app de autenticación (Google
            Authenticator, Aegis, etc.). Después de activarla, pedirá un código
            al entrar a coordinación.
          </p>
          <button
            type="button"
            onClick={startEnroll}
            disabled={busy}
            className="min-h-[44px] self-start rounded-xl bg-coordinator px-4 font-medium text-white disabled:opacity-60"
          >
            Activar verificación en dos pasos
          </button>
        </div>
      )}

      {step === "verify_enroll" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Escanea el código con tu app de autenticación y luego escribe el
            código de 6 dígitos para confirmar.
          </p>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt="Código QR para la app de autenticación"
              className="size-44 self-center rounded-xl bg-white p-2"
            />
          )}
          {secret && (
            <p className="break-all text-center text-xs text-muted">
              ¿No puedes escanear? Clave:{" "}
              <span className="font-mono text-foreground">{secret}</span>
            </p>
          )}
          <CodeForm
            code={code}
            setCode={setCode}
            onSubmit={submitCode}
            busy={busy}
            label="Confirmar"
          />
        </div>
      )}

      {step === "challenge" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Escribe el código de 6 dígitos de tu app de autenticación para
            continuar.
          </p>
          <CodeForm
            code={code}
            setCode={setCode}
            onSubmit={submitCode}
            busy={busy}
            label="Verificar"
          />
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-foreground">
            Verificación en dos pasos activa.
          </p>
          <button
            type="button"
            onClick={unenroll}
            disabled={busy}
            className="min-h-[44px] self-start rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground disabled:opacity-60"
          >
            Desactivar
          </button>
        </div>
      )}
    </div>
  );
}

function CodeForm({
  code,
  setCode,
  onSubmit,
  busy,
  label,
}: {
  code: string;
  setCode: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  label: string;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-wrap gap-2"
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        placeholder="000000"
        required
        aria-label="Código de verificación"
        className="min-h-[44px] flex-1 rounded-xl border border-border bg-surface px-3 text-center font-mono tracking-widest text-foreground"
      />
      <button
        type="submit"
        disabled={busy || code.trim().length < 6}
        className="min-h-[44px] rounded-xl bg-coordinator px-4 font-medium text-white disabled:opacity-60"
      >
        {label}
      </button>
    </form>
  );
}
