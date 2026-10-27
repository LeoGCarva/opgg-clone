import Link from "next/link";
import { WORLDS_2026 } from "@/lib/esports/worlds";

const TABS = {
  calendar: { label: "Calendário", href: WORLDS_2026.basePath },
  standings: { label: "Classificação", href: `${WORLDS_2026.basePath}/standings` },
  stats: { label: "Estatísticas", href: `${WORLDS_2026.basePath}/stats` },
} as const;

export type WorldsTab = keyof typeof TABS;

export const pill = (active: boolean) =>
  `flex h-11 items-center px-4 text-sm font-semibold ${active ? "bg-ink text-white" : "text-ink hover:bg-canvas"}`;

/** Abas da seção; cada página diz qual está ativa (sem usePathname, tudo no servidor). */
export function WorldsTabs({ active }: { active?: WorldsTab }) {
  return (
    <nav className="flex w-fit flex-wrap gap-1 border border-line bg-surface p-1">
      {(Object.keys(TABS) as WorldsTab[]).map((tab) => (
        <Link key={tab} href={TABS[tab].href} className={pill(tab === active)}>
          {TABS[tab].label}
        </Link>
      ))}
    </nav>
  );
}

export function LeaguepediaErrorBox({ error }: { error: string }) {
  return <div className="border border-loss/40 bg-loss/10 p-4 text-loss">{error}</div>;
}
