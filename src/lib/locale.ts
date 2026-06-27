import { cookies } from "next/headers";

import { isLocale, type Locale } from "@/lib/i18n";

// Read the chosen language from the `lang` cookie (set by LanguageToggle).
// Defaults to Spanish — the app is Spanish-first.
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get("lang")?.value;
  return isLocale(value) ? value : "es";
}
