"use client";

import { useEffect, useState } from "react";
import type { SearchSuggestion } from "@/app/api/search/route";

const DEBOUNCE_MS = 200;
const MIN_LENGTH = 2;

/** Sugestões do /api/search para o texto digitado, com debounce e cancelamento. */
export function usePlayerSuggestions(query: string, region: string) {
  const [result, setResult] = useState<{ key: string; suggestions: SearchSuggestion[] }>({
    key: "",
    suggestions: [],
  });
  const trimmed = query.trim();
  const key = `${region}|${trimmed}`;
  const enabled = trimmed.split("#")[0].trim().length >= MIN_LENGTH;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?${new URLSearchParams({ q: trimmed, region })}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const body = (await res.json()) as { suggestions: SearchSuggestion[] };
        setResult({ key, suggestions: body.suggestions });
      } catch {
        // Abortada (o usuário continuou digitando) ou falha de rede: só não mostra sugestões.
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, key, trimmed, region]);

  // Resultado de uma busca antiga não é mostrado para o texto atual.
  const fresh = enabled && result.key === key;
  return {
    suggestions: fresh ? result.suggestions : [],
    loading: enabled && !fresh,
  };
}
