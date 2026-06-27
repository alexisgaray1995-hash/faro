import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Mapa de recursos" };

export default function MapaPage() {
  return (
    <ComingSoon
      title="Mapa de recursos"
      description="Aquí verás agua, comida, refugios y peligros cercanos en un mapa que funciona sin internet. Esta función llega en la próxima versión."
    />
  );
}
