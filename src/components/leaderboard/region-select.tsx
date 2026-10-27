"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { href, type Query } from "@/components/champions/href";

/** Região do ranking: navega ao trocar (sem JS, o botão "Ir" envia o form GET). `query` = filtros mantidos. */
export function RegionSelect({
  basePath,
  regions,
  active,
  query,
}: {
  basePath: string;
  regions: readonly string[];
  active: string;
  query: Query;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form action={basePath} className="flex items-center gap-2">
      {Object.entries(query).map(([name, value]) => value && <input key={name} type="hidden" name={name} value={value} />)}
      <label htmlFor="leaderboard-region" className="text-sm font-semibold text-muted">
        Região
      </label>
      <select
        id="leaderboard-region"
        name="region"
        defaultValue={active}
        disabled={pending}
        onChange={(e) => {
          const region = e.target.value;
          startTransition(() => router.push(href(basePath, { ...query, region: region === "br" ? undefined : region })));
        }}
        className="h-11 border border-line-strong bg-surface px-3 font-display text-sm font-extrabold uppercase outline-none hover:border-ink focus-visible:border-ink disabled:opacity-60"
      >
        {regions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="h-11 border border-ink px-3 text-sm font-semibold">
          Ir
        </button>
      </noscript>
    </form>
  );
}
