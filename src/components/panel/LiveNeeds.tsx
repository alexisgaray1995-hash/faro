"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

// Keeps a server-rendered needs list fresh: subscribe to changes on the needs
// table and re-fetch the route when one lands, so a responder sees new and
// updated needs without pulling to refresh.
// ponytail: refresh the whole route (simple, RLS-correct) instead of patching
// individual rows client-side. Fine at dashboard scale; revisit if the list
// grows into the thousands.
export function LiveNeeds() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Coalesce bursts (a batch sync, or an assignment moving through statuses)
    // into one refresh so we don't thrash the server.
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };

    const channel = supabase
      .channel("needs-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "needs" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assignments" },
        refresh,
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
