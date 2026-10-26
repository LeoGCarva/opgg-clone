"use client";

import { useSyncExternalStore } from "react";

// Buscas recentes ficam só no navegador (localStorage). Toda leitura/escrita é protegida:
// o storage pode estar bloqueado (aba anônima, cookies desativados).

export type RecentSearch = {
  gameName: string;
  tagLine: string;
  region: string;
  iconUrl: string | null;
};

const KEY = "opgg-clone:recent-searches";
const MAX = 5;
const EVENT = "recent-searches-change";
const EMPTY: RecentSearch[] = [];

let cache: { raw: string | null; value: RecentSearch[] } = { raw: null, value: EMPTY };

function read(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== cache.raw) {
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      cache = { raw, value: Array.isArray(parsed) ? (parsed as RecentSearch[]).slice(0, MAX) : EMPTY };
    }
    return cache.value;
  } catch {
    return EMPTY;
  }
}

function write(list: RecentSearch[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Sem storage: recentes simplesmente não são lembradas.
  }
}

const same = (a: RecentSearch, b: RecentSearch) =>
  a.region === b.region &&
  a.gameName.toLowerCase() === b.gameName.toLowerCase() &&
  a.tagLine.toLowerCase() === b.tagLine.toLowerCase();

export function addRecentSearch(entry: RecentSearch) {
  write([entry, ...read().filter((r) => !same(r, entry))]);
}

export function removeRecentSearch(entry: RecentSearch) {
  write(read().filter((r) => !same(r, entry)));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange); // outras abas
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useRecentSearches(): RecentSearch[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
