import type { Metadata } from "next";

import { LegalDoc, type LegalContent } from "@/components/legal/LegalDoc";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = { title: "Términos de uso" };

const ES: LegalContent = {
  title: "Términos de uso",
  updated: "Actualizado: 27 de junio de 2026",
  intro:
    "Faro es una herramienta gratuita y de código abierto para coordinar ayuda en emergencias. Al usarla, aceptas estos términos.",
  sections: [
    {
      heading: "1. Qué es Faro",
      body: [
        "Faro ayuda a personas y equipos de respuesta a compartir y encontrar información durante emergencias: pedidos de ayuda, peligros y puntos de recursos. No es un servicio de emergencia, de rescate ni de atención médica.",
      ],
    },
    {
      heading: "2. No reemplaza a los servicios de emergencia",
      body: [
        "Si hay peligro inmediato para la vida, llama a los servicios de emergencia (911). Faro no garantiza que tu pedido sea visto ni que llegue ayuda, y no debe usarse como único medio para pedir auxilio.",
      ],
    },
    {
      heading: "3. La información la reporta la comunidad",
      body: [
        "Los pedidos, peligros y recursos los reportan personas y voluntarios. Pueden estar desactualizados, incompletos o ser incorrectos. Verifica la información por otros medios antes de actuar.",
      ],
    },
    {
      heading: "4. Uso por voluntarios y rescatistas",
      body: [
        "Los voluntarios actúan según su propio criterio y formación. No son empleados ni agentes de Abby Systems. No te expongas a peligro y sigue siempre las indicaciones de las autoridades y de protección civil.",
      ],
    },
    {
      heading: "5. Contenido que envías",
      body: [
        "Eres responsable de la veracidad de lo que reportas. No incluyas datos personales (nombre, teléfono, dirección) en los campos públicos. Podemos eliminar reportes falsos, peligrosos o que pongan en riesgo a otras personas.",
      ],
    },
    {
      heading: "6. Sin garantías y límite de responsabilidad",
      body: [
        "Faro se ofrece «tal cual», sin garantía de disponibilidad, exactitud ni continuidad. En la medida que permita la ley, Abby Systems no se responsabiliza por daños o decisiones tomadas a partir de la información de la plataforma.",
      ],
    },
    {
      heading: "7. Cambios",
      body: [
        "Podemos actualizar estos términos. El uso continuado de Faro implica la aceptación de la versión vigente.",
      ],
    },
  ],
  note: "Este es un resumen en lenguaje claro, no asesoría legal. Para una emergencia, llama al 911.",
};

const EN: LegalContent = {
  title: "Terms of Use",
  updated: "Updated June 27, 2026",
  intro:
    "Faro is a free, open-source tool for coordinating help during emergencies. By using it, you accept these terms.",
  sections: [
    {
      heading: "1. What Faro is",
      body: [
        "Faro helps people and response teams share and find information during emergencies: help requests, hazards, and resource points. It is not an emergency, rescue, or medical service.",
      ],
    },
    {
      heading: "2. It does not replace emergency services",
      body: [
        "If there is an immediate threat to life, call emergency services (911). Faro cannot guarantee your request will be seen or that help will arrive, and must not be your only way to call for help.",
      ],
    },
    {
      heading: "3. Information is community-reported",
      body: [
        "Requests, hazards, and resources are reported by people and volunteers. They may be outdated, incomplete, or wrong. Verify information through other means before acting.",
      ],
    },
    {
      heading: "4. Use by volunteers and responders",
      body: [
        "Volunteers act on their own judgment and training. They are not employees or agents of Abby Systems. Do not put yourself in danger, and always follow the instructions of authorities and civil protection.",
      ],
    },
    {
      heading: "5. Content you submit",
      body: [
        "You are responsible for the accuracy of what you report. Do not put personal data (name, phone, address) in public fields. We may remove false, dangerous, or harmful reports.",
      ],
    },
    {
      heading: "6. No warranty and limitation of liability",
      body: [
        'Faro is provided "as is," without warranty of availability, accuracy, or continuity. To the extent permitted by law, Abby Systems is not liable for damages or decisions made based on the platform\'s information.',
      ],
    },
    {
      heading: "7. Changes",
      body: [
        "We may update these terms. Continued use of Faro means you accept the current version.",
      ],
    },
  ],
  note: "This is a plain-language summary, not legal advice. In an emergency, call 911.",
};

export default async function TerminosPage() {
  const locale = await getLocale();
  const content = locale === "en" ? EN : ES;
  const otherLabel =
    locale === "en" ? "Privacy Policy" : "Política de privacidad";
  return (
    <LegalDoc
      locale={locale}
      content={content}
      otherHref="/privacidad"
      otherLabel={otherLabel}
    />
  );
}
