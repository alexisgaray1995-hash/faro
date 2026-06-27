import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Pedir ayuda" };

export default function SosPage() {
  return (
    <ComingSoon
      title="Pedir ayuda"
      description="Aquí podrás enviar un SOS con tu ubicación, sin cuenta y sin internet. Esta función llega en la próxima versión."
    />
  );
}
