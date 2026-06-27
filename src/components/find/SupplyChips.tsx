import {
  SUPPLY_STATUS_EMOJI,
  supplyLineText,
  type SupplyLine,
} from "@/lib/supply";

// Shared read-only supply display: one chip per category line, emoji-coded by
// status. Renders nothing when there is no supply data (unknown ≠ out).
export function SupplyChips({ supplies }: { supplies: SupplyLine[] | null }) {
  if (!supplies || supplies.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {supplies.map((s) => (
        <li
          key={s.category}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-night/30 px-2 py-0.5 text-xs text-foreground"
        >
          <span aria-hidden>{SUPPLY_STATUS_EMOJI[s.status]}</span>
          {supplyLineText(s)}
        </li>
      ))}
    </ul>
  );
}
