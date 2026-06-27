import Image from "next/image";

export function Brand({ withTagline = false }: { withTagline?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/icons/faro.svg"
        alt=""
        width={48}
        height={48}
        priority
        className="h-12 w-12"
      />
      <div>
        <p className="text-2xl font-bold tracking-tight text-foreground">
          Faro
        </p>
        {withTagline && (
          <p className="text-sm text-muted">
            Ayuda en emergencias, funcione o no el internet.
          </p>
        )}
      </div>
    </div>
  );
}
