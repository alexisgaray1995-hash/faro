import Link from "next/link";
import type { ReactNode } from "react";
import type { RoleEntry } from "@/lib/constants";

// Static class maps so Tailwind's JIT keeps these classes in the build.
const COLOR_CLASSES: Record<RoleEntry["color"], string> = {
  help: "bg-help hover:bg-red-700 focus-visible:ring-red-400",
  volunteer: "bg-volunteer hover:bg-green-700 focus-visible:ring-green-400",
  coordinator: "bg-coordinator hover:bg-blue-700 focus-visible:ring-blue-400",
};

const ICONS: Record<RoleEntry["color"], ReactNode> = {
  help: (
    // Life-ring / SOS
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v5M12 16v5M3 12h5M16 12h5" />
    </svg>
  ),
  volunteer: (
    // Helping hands / heart
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" />
    </svg>
  ),
  coordinator: (
    // Clipboard / coordination
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4h6v3H9zM8 11h8M8 15h8" />
    </svg>
  ),
};

export function RoleButton({ entry }: { entry: RoleEntry }) {
  return (
    <Link
      href={entry.href}
      className={`flex min-h-[64px] items-center gap-4 rounded-2xl px-5 py-4 text-left text-white shadow-sm outline-none transition focus-visible:ring-4 ${COLOR_CLASSES[entry.color]}`}
    >
      <span className="h-9 w-9 shrink-0" aria-hidden="true">
        {ICONS[entry.color]}
      </span>
      <span className="text-xl font-semibold">{entry.labelEs}</span>
    </Link>
  );
}
