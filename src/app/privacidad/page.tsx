import type { Metadata } from "next";

import { LegalDoc, type LegalContent } from "@/components/legal/LegalDoc";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = { title: "Política de privacidad" };

const ES: LegalContent = {
  title: "Política de privacidad",
  updated: "Actualizado: 27 de junio de 2026",
  intro:
    "Faro recoge lo mínimo para coordinar ayuda. Sin anuncios, sin rastreo, sin venta de datos.",
  sections: [
    {
      heading: "1. Qué recopilamos",
      body: [
        "Ubicación aproximada (del GPS de tu teléfono) para situar tu reporte en el mapa, la descripción que escribes y, solo en los pedidos de ayuda, los datos de contacto que decidas dar (nombre y teléfono, opcionales).",
        "Pedir ayuda es anónimo: no necesitas crear una cuenta.",
      ],
    },
    {
      heading: "2. Qué es público y qué no",
      body: [
        "La ubicación de peligros y pedidos de ayuda se difumina en la vista pública para no señalar tu casa exacta. Tus datos de contacto NUNCA son públicos: solo los ven equipos de respuesta verificados.",
        "Los reportes de personas desaparecidas no tienen vista pública.",
      ],
    },
    {
      heading: "3. Para qué los usamos",
      body: [
        "Únicamente para coordinar la respuesta a la emergencia: mostrar necesidades, peligros y recursos a quienes pueden ayudar. No hay publicidad ni perfilado.",
      ],
    },
    {
      heading: "4. Cuánto los guardamos",
      body: [
        "Los pedidos y peligros expiran y se ocultan de las vistas públicas (por defecto a las 48 horas). Mientras estés sin conexión, tu reporte se guarda solo en tu teléfono hasta que haya internet para enviarlo.",
      ],
    },
    {
      heading: "5. Con quién los compartimos",
      body: [
        "Con los equipos de respuesta verificados que usan Faro. No vendemos ni compartimos tus datos con terceros con fines comerciales.",
      ],
    },
    {
      heading: "6. Tus opciones",
      body: [
        "No incluyas datos personales en los campos públicos de descripción. Puedes solicitar la eliminación de un reporte escribiendo al contacto de tu equipo local o coordinador.",
      ],
    },
  ],
  note: "Este es un resumen en lenguaje claro, no asesoría legal.",
};

const EN: LegalContent = {
  title: "Privacy Policy",
  updated: "Updated June 27, 2026",
  intro:
    "Faro collects the minimum needed to coordinate help. No ads, no tracking, no selling data.",
  sections: [
    {
      heading: "1. What we collect",
      body: [
        "Approximate location (from your phone's GPS) to place your report on the map, the description you write, and — only for help requests — the contact details you choose to give (name and phone, optional).",
        "Asking for help is anonymous: you don't need an account.",
      ],
    },
    {
      heading: "2. What is public and what isn't",
      body: [
        "The location of hazards and help requests is blurred in the public view so it doesn't pinpoint your home. Your contact details are NEVER public: only verified response teams can see them.",
        "Missing-person reports have no public view.",
      ],
    },
    {
      heading: "3. How we use it",
      body: [
        "Only to coordinate the emergency response: showing needs, hazards, and resources to people who can help. No advertising, no profiling.",
      ],
    },
    {
      heading: "4. How long we keep it",
      body: [
        "Requests and hazards expire and are hidden from public views (48 hours by default). While you are offline, your report is stored only on your phone until there is internet to send it.",
      ],
    },
    {
      heading: "5. Who we share it with",
      body: [
        "With the verified response teams using Faro. We do not sell or share your data with third parties for commercial purposes.",
      ],
    },
    {
      heading: "6. Your choices",
      body: [
        "Don't put personal data in public description fields. You can request removal of a report by contacting your local team or coordinator.",
      ],
    },
  ],
  note: "This is a plain-language summary, not legal advice.",
};

export default async function PrivacidadPage() {
  const locale = await getLocale();
  const content = locale === "en" ? EN : ES;
  const otherLabel = locale === "en" ? "Terms of Use" : "Términos de uso";
  return (
    <LegalDoc
      locale={locale}
      content={content}
      otherHref="/terminos"
      otherLabel={otherLabel}
    />
  );
}
