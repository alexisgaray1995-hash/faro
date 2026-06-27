import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Panel de coordinación" };

export default function CoordinadorPage() {
  return (
    <ComingSoon
      title="Panel de coordinación"
      description="Aquí los coordinadores verán, verificarán y asignarán necesidades. Requiere iniciar sesión. Esta función llega en la próxima versión."
    />
  );
}
