import { WORLDS_2026 } from "@/lib/esports/worlds";

export default function WorldsLayout({ children }: LayoutProps<"/esports/worlds-2026">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">{WORLDS_2026.title}</h1>
        <p className="text-sm text-muted">Campeonato Mundial de League of Legends · horários de Brasília</p>
      </div>
      {children}
      <p className="border-t border-line pt-4 text-xs text-muted">
        Dados:{" "}
        <a href={WORLDS_2026.wikiUrl} target="_blank" rel="noreferrer" className="underline hover:text-ink-soft">
          Leaguepedia
        </a>{" "}
        (CC BY-SA 3.0), atualizados a cada ~10 minutos. Ícones: Data Dragon da Riot Games.
      </p>
    </main>
  );
}
