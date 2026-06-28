"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

// Keeps the server-rendered /recursos points fresh: subscribe to changes on
// resources + resource_supplies and re-fetch the route when one lands, so a
// responder sees another responder's edits without pulling to refresh.
// ponytail: refresh the whole route (simple, RLS-correct) instead of patching
// rows client-side. Fine at dashboard scale.
export function LiveResources() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };

    const channel = supabase
      .channel("resources-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "resources" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "resource_supplies" },
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
