"use client";

import { useRouter } from "next/navigation";

import { OTHER, SWITCH_LABEL, type Locale } from "@/lib/i18n";

// Persist the choice in a cookie and re-render the server tree. No library:
// one cookie + router.refresh() covers a two-language toggle.
export function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const next = OTHER[locale];

  function switchTo() {
    document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={switchTo}
      lang={next}
      aria-label={locale === "es" ? "Switch to English" : "Cambiar a español"}
      className="min-h-[44px] rounded-full border border-border bg-surface px-3 text-sm font-medium text-foreground"
    >
      {SWITCH_LABEL[locale]}
    </button>
  );
}
