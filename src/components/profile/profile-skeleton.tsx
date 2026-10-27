import { Skeleton, SkeletonRegion, TabsSkeleton } from "@/components/loading/skeleton";

/** Perfil (e a página de JSON cru): cabeçalho, cards de elo à esquerda, partidas à direita. */
export function ProfileSkeleton() {
  return (
    <SkeletonRegion label="o perfil" className="space-y-8">
      <div className="flex flex-wrap items-center gap-5">
        <Skeleton className="size-22" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="ml-auto h-10 w-28" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3 border border-line bg-surface p-4">
              <Skeleton className="h-4 w-32" />
              <div className="flex items-center gap-3">
                <Skeleton className="size-14" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
          ))}
          <Skeleton className="h-64" />
        </div>
        <div className="min-w-0 space-y-3">
          <TabsSkeleton count={3} />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}

/** Campeões do jogador: abas de fila e linhas da tabela. */
export function PlayerChampionsSkeleton() {
  return (
    <SkeletonRegion label="os campeões do jogador" className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <TabsSkeleton count={3} />
      <div className="border border-line bg-surface">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-divider px-4 py-3 first:border-t-0">
            <Skeleton className="size-9 shrink-0" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="ml-auto h-5 w-2/5" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}
