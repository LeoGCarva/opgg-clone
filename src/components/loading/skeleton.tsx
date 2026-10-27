// Peças dos esqueletos de carregamento (fallbacks dos <Suspense> de cada página).

/** Bloco cinza pulsando; o tamanho vem do `className`. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse bg-divider motion-reduce:animate-none ${className}`} />;
}

/** Envolve um esqueleto: leitores de tela ouvem um só "Carregando…" em vez de blocos vazios. */
export function SkeletonRegion({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">Carregando {label}…</span>
      {children}
    </div>
  );
}

/**
 * Topo das páginas com título grande (tier list, ranking): o título é fixo e aparece de verdade;
 * só a linha de dados e os filtros pulsam.
 */
export function PageHeroSkeleton({
  title,
  filterRows = 1,
  tabs = 5,
  rightTabs = 3,
}: {
  title: string;
  filterRows?: number;
  tabs?: number; // abas à esquerda na 1ª fileira de filtros
  rightTabs?: number;
}) {
  return (
    <>
      <section className="border-b-2 border-ink">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-x-10 gap-y-4 px-6 pt-12 pb-8">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-72 max-w-full" />
            <h1 className="text-[clamp(48px,8vw,104px)] leading-[0.9]">{title}</h1>
          </div>
          <div className="w-[360px] max-w-full space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </section>
      <section aria-hidden="true" className="border-b border-line bg-surface">
        {Array.from({ length: filterRows }, (_, i) => (
          <div
            key={i}
            className={`mx-auto flex max-w-[1240px] flex-wrap items-center gap-3 px-6 py-4 ${i > 0 ? "border-t border-line" : ""}`}
          >
            <TabsSkeleton count={i === 0 ? tabs : 1} wide={i > 0} />
            <div className="lg:ml-auto">
              <TabsSkeleton count={rightTabs} />
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

/** Fileira de abas (rota, elo, fila…). */
export function TabsSkeleton({ count, wide = false }: { count: number; wide?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={`h-11 ${wide ? "w-80 max-w-full" : "w-20"}`} />
      ))}
    </div>
  );
}
