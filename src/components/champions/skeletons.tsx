import { PageHeroSkeleton, Skeleton, SkeletonRegion, TabsSkeleton } from "@/components/loading/skeleton";

// Quantos campeões de mentira em cada faixa (S+ … C), só para dar o formato.
const BAND_SIZES = [4, 9, 12, 10, 6];

export function TierListSkeleton() {
  return (
    <SkeletonRegion label="a tier list">
      <PageHeroSkeleton title="Tier list" filterRows={2} />
      <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-6 pt-8 pb-20">
        {BAND_SIZES.map((size, i) => (
          <div key={i} className="flex min-h-24 border border-line bg-surface">
            <Skeleton className="w-[104px] shrink-0" />
            <div className="flex flex-1 flex-wrap items-center gap-3 px-5 py-4">
              {Array.from({ length: size }, (_, j) => (
                <Skeleton key={j} className="h-11 w-32 rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

export function ChampionSkeleton() {
  return (
    <SkeletonRegion label="o campeão" className="space-y-6">
      <Skeleton className="h-4 w-20" />
      <header className="flex flex-wrap items-center gap-5">
        <Skeleton className="size-20" />
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="ml-auto grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-6 w-14" />
            </div>
          ))}
        </div>
      </header>
      <div className="flex flex-col gap-2 lg:flex-row lg:justify-between">
        <TabsSkeleton count={3} />
        <TabsSkeleton count={3} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CardSkeleton className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        </CardSkeleton>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:col-span-2">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i}>
              <OptionRowsSkeleton />
            </CardSkeleton>
          ))}
        </div>
        <CardSkeleton className="lg:col-span-2">
          <OptionRowsSkeleton icons={3} />
          <div className="grid grid-cols-1 gap-4 border-t border-line pt-3 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <OptionRowsSkeleton key={i} icons={1} />
            ))}
          </div>
        </CardSkeleton>
        <CardSkeleton className="lg:col-span-2">
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
            <div className="lg:w-72">
              <OptionRowsSkeleton icons={3} />
            </div>
            <Skeleton className="h-28 w-full max-w-[28rem]" />
          </div>
        </CardSkeleton>
        {[1, 2].map((i) => (
          <CardSkeleton key={i}>
            <OptionRowsSkeleton icons={1} rows={5} />
          </CardSkeleton>
        ))}
      </div>
    </SkeletonRegion>
  );
}

/** Mesmo contorno dos cartões da página do campeão. */
function CardSkeleton({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`min-w-0 space-y-3 border border-line bg-surface p-4 ${className}`}>
      <Skeleton className="h-4 w-24" />
      {children}
    </div>
  );
}

/** Linhas "ícones … WR / jogos", como as listas de opções de build. */
function OptionRowsSkeleton({ icons = 2, rows = 3 }: { icons?: number; rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex gap-1">
            {Array.from({ length: icons }, (_, j) => (
              <Skeleton key={j} className="size-9" />
            ))}
          </div>
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
