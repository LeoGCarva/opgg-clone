import { Skeleton, SkeletonRegion } from "@/components/loading/skeleton";

/** Calendário, classificação e estatísticas: filtro + blocos de linhas. */
export function WorldsListSkeleton() {
  return (
    <SkeletonRegion label="o Worlds" className="space-y-6">
      <Skeleton className="h-11 w-80 max-w-full" />
      {[4, 3].map((rows, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <div className="border border-line bg-surface">
            {Array.from({ length: rows }, (_, j) => (
              <div key={j} className="flex items-center gap-4 border-t border-divider px-4 py-3 first:border-t-0">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="size-8" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="size-8" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

/** Série: placar, abas dos jogos e os 5 jogadores de cada lado. */
export function SeriesSkeleton() {
  return (
    <SkeletonRegion label="a série" className="space-y-6">
      <div className="flex items-center justify-center gap-6 border border-line bg-surface p-6">
        <Skeleton className="size-16" />
        <Skeleton className="h-12 w-28" />
        <Skeleton className="size-16" />
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-11 w-20" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2].map((side) => (
          <div key={side} className="space-y-2 border border-line bg-surface p-4">
            <Skeleton className="h-6 w-40" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-10 shrink-0" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}
