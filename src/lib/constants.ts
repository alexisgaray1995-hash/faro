// App-wide constants. Domain enums (needs, resources, hazards) arrive in M1.

export const APP_NAME = "Faro";
export const APP_TAGLINE_ES =
  "Ayuda en emergencias, funcione o no el internet.";
export const APP_TAGLINE_EN = "Emergency help, with or without the internet.";

export type Role = "citizen" | "volunteer" | "coordinator";

export interface RoleEntry {
  role: Role;
  /** Spanish label (default language). */
  labelEs: string;
  /** English label (toggle). */
  labelEn: string;
  href: string;
  /** Tailwind color token from the theme. */
  color: "help" | "volunteer" | "coordinator";
}

export const ROLES: readonly RoleEntry[] = [
  {
    role: "citizen",
    labelEs: "Necesito ayuda",
    labelEn: "I need help",
    href: "/sos",
    color: "help",
  },
  {
    role: "volunteer",
    labelEs: "Quiero ayudar",
    labelEn: "I want to help",
    href: "/mapa",
    color: "volunteer",
  },
  {
    role: "coordinator",
    labelEs: "Soy coordinador",
    labelEn: "I'm a coordinator",
    href: "/coordinador",
    color: "coordinator",
  },
] as const;
