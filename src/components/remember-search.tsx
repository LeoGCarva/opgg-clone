"use client";

import { useEffect } from "react";
import { addRecentSearch, type RecentSearch } from "./recent-searches";

/** Sem UI: registra o perfil aberto nas buscas recentes (só jogadores que existem entram). */
export function RememberSearch({ gameName, tagLine, region, iconUrl }: RecentSearch) {
  useEffect(() => {
    addRecentSearch({ gameName, tagLine, region, iconUrl });
  }, [gameName, tagLine, region, iconUrl]);
  return null;
}
