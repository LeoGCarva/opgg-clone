import { PageHeroSkeleton, Skeleton, SkeletonRegion } from "@/components/loading/skeleton";

const ROWS = 10;

export function LeaderboardSkeleton() {
  return (
    <SkeletonRegion label="o ranking">
      {/* Abas Desafiante / Grão-Mestre / Mestre e o seletor de região. */}
      <PageHeroSkeleton title="Ranking" tabs={3} rightTabs={1} />
      <div className="mx-auto max-w-[1240px] px-6 pt-8 pb-20">
        <div className="border border-line bg-surface">
          <div className="border-b-2 border-ink px-3 py-3 sm:px-5">
            <Skeleton className="h-3 w-full max-w-[640px]" />
          </div>
          {Array.from({ length: ROWS }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-t border-divider px-3 py-2.5 first:border-t-0 sm:gap-5 sm:px-5">
              <Skeleton className="h-6 w-7 shrink-0" />
              <Skeleton className="hidden size-9 shrink-0 sm:block" />
              <Skeleton className="h-5 min-w-0 flex-1" />
              <Skeleton className="hidden h-5 w-24 sm:block" />
              <Skeleton className="h-5 w-12" />
              <Skeleton className="hidden h-5 w-20 sm:block" />
              <Skeleton className="h-2 w-16 sm:w-32" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}
