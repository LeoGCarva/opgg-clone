"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { href, type Query } from "./href";

const DEBOUNCE_MS = 250;

/**
 * Busca por nome na tier list. Sem JS é um form GET comum (Enter); com JS atualiza `?q=`
 * enquanto digita. `query` = os parâmetros mantidos na URL ao buscar.
 */
export function TierSearch({ basePath, defaultValue, query }: { basePath: string; defaultValue: string; query: Query }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const go = (q: string) => {
    clearTimeout(timer.current);
    startTransition(() => router.replace(href(basePath, { ...query, q: q.trim() || undefined }), { scroll: false }));
  };

  return (
    <form
      action={basePath}
      role="search"
      className="w-full sm:w-[340px]"
      onSubmit={(e) => {
        e.preventDefault();
        go(new FormData(e.currentTarget).get("q")?.toString() ?? "");
      }}
    >
      {Object.entries(query).map(([name, value]) => value && <input key={name} type="hidden" name={name} value={value} />)}
      <div className="flex h-11 items-center border border-line-strong bg-surface focus-within:border-ink">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="ml-3 size-4 shrink-0 fill-none stroke-muted stroke-2">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="m13 13 4.5 4.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          onChange={(e) => {
            const value = e.target.value;
            clearTimeout(timer.current);
            timer.current = setTimeout(() => go(value), DEBOUNCE_MS);
          }}
          placeholder="Buscar campeão"
          aria-label="Buscar campeão"
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted"
        />
        {pending && <span className="mr-3 size-3 shrink-0 animate-spin rounded-full border-2 border-line-strong border-t-ink" aria-hidden="true" />}
      </div>
    </form>
  );
}
