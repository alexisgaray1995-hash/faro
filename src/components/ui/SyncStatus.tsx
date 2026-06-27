"use client";

import { useEffect, useState } from "react";

// Honest connectivity indicator (Golden Rule #6). In M2 this also shows the
// number of queued items waiting to sync and the last successful sync time.
export function SyncStatus() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // Before mount we don't know connectivity — render a neutral placeholder
  // to avoid a hydration mismatch.
  const label =
    online === null
      ? "Comprobando conexión…"
      : online
        ? "En línea"
        : "Sin conexión — la app sigue funcionando";

  const dotClass =
    online === null ? "bg-muted" : online ? "bg-volunteer" : "bg-beacon";

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} aria-hidden />
      <span>{label}</span>
    </div>
  );
}
