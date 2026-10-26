"use client";

import { useRouter } from "next/navigation";
import { useActionState, useId, useState } from "react";
import { searchPlayer, type SearchState } from "@/app/actions";
import { toRiotIdSlug } from "@/lib/riot/riot-id";
import { REGION_SLUGS } from "@/lib/riot/routing";
import { removeRecentSearch, useRecentSearches, type RecentSearch } from "./recent-searches";
import { usePlayerSuggestions } from "./use-player-suggestions";

type Option = {
  gameName: string;
  tagLine: string;
  region: string;
  iconUrl: string | null;
  detail: string | null;
  recent?: RecentSearch;
};

export function SearchForm({ compact = false }: { compact?: boolean }) {
  const [state, action, pending] = useActionState<SearchState, FormData>(searchPlayer, {});
  const router = useRouter();
  const listId = useId();
  const [region, setRegion] = useState("br");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const recent = useRecentSearches();
  const { suggestions } = usePlayerSuggestions(query, region);
  const showingRecent = query.trim() === "";
  const options: Option[] = showingRecent
    ? recent.map((r) => ({ ...r, detail: r.region.toUpperCase(), recent: r }))
    : suggestions.map((s) => ({ ...s, region }));
  const expanded = open && options.length > 0;

  function choose(option: Option) {
    setOpen(false);
    setActive(-1);
    setQuery("");
    router.push(`/lol/${option.region}/${toRiotIdSlug(option)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!expanded) {
      if (e.key === "ArrowDown") setOpen(true);
      return; // Enter sem lista aberta: envia o formulário normalmente (busca exata na Riot).
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(options[active]);
    }
  }

  return (
    <form action={action} className={compact ? "w-full sm:max-w-md sm:flex-1" : "w-full max-w-xl"}>
      <div className="flex gap-2">
        <select
          name="region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          aria-label="Região"
          className="rounded-md border border-zinc-700 bg-zinc-900 px-2 text-sm uppercase"
        >
          {REGION_SLUGS.map((slug) => (
            <option key={slug} value={slug}>
              {slug}
            </option>
          ))}
        </select>

        <div
          className="relative min-w-0 flex-1"
          // Fecha ao sair do campo e da lista (mas não ao clicar dentro da lista).
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
          }}
        >
          <input
            name="riotId"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Nome#TAG"
            aria-label="Riot ID"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            required
            className={`w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 outline-none focus:border-sky-500 ${
              compact ? "py-1.5 text-sm" : "py-3"
            }`}
          />

          {expanded && (
            <ul
              id={listId}
              role="listbox"
              aria-label={showingRecent ? "Buscas recentes" : "Sugestões de jogadores"}
              className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
            >
              {showingRecent && (
                <li role="presentation" className="px-3 py-1 text-xs text-zinc-500">
                  Buscas recentes
                </li>
              )}
              {options.map((o, i) => (
                <li
                  key={`${o.region}-${o.gameName}-${o.tagLine}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // mousedown + preventDefault: escolhe antes do blur fechar a lista.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(o);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm ${
                    i === active ? "bg-zinc-800" : ""
                  }`}
                >
                  {o.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- ícone de 24px do CDN, sem otimização
                    <img src={o.iconUrl} alt="" width={24} height={24} className="rounded" />
                  ) : (
                    <span className="size-6 rounded bg-zinc-800" />
                  )}
                  <span className="min-w-0 flex-1 truncate">
                    {o.gameName}
                    <span className="text-zinc-500">#{o.tagLine}</span>
                  </span>
                  {o.detail && <span className="shrink-0 text-xs text-zinc-500">{o.detail}</span>}
                  {o.recent && (
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={`Remover ${o.gameName}#${o.tagLine} das recentes`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeRecentSearch(o.recent!);
                      }}
                      className="shrink-0 rounded px-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200"
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-sky-600 px-4 text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
        >
          {pending ? "Buscando..." : "Buscar"}
        </button>
      </div>
      {state.error && <p className="mt-2 text-sm text-red-400">{state.error}</p>}
    </form>
  );
}
