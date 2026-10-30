"use client";

import { useState, type ReactNode } from "react";
import type { QueueFilter } from "@/lib/services/profile";
import { QUEUE_TABS } from "./queue-tabs";

/** Abas do card de campeões: troca a fila só no card, sem mexer na URL nem no histórico. */
export function ChampionSummaryTabs({
  initial,
  panels,
}: {
  initial: QueueFilter;
  panels: Record<QueueFilter, ReactNode>;
}) {
  const [active, setActive] = useState(initial);

  return (
    <>
      <div className="mt-3 flex gap-1 border border-line p-0.5 text-xs">
        {QUEUE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-pressed={tab.value === active}
            onClick={() => setActive(tab.value)}
            className={`h-8 flex-1 font-semibold ${
              tab.value === active ? "bg-ink text-white" : "text-ink hover:bg-canvas"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {panels[active]}
    </>
  );
}
