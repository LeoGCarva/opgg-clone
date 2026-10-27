import { isTbd, type Team } from "@/lib/esports/parse";

/** Logo do time (vem da Leaguepedia); sem logo, um quadrado com a sigla. O contorno claro deixa logos pretos visíveis. */
export function TeamLogo({ team, size = 24 }: { team: Team | undefined; size?: number }) {
  if (!team?.logo) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center bg-divider text-[10px] font-bold text-muted"
        style={{ width: size, height: size }}
      >
        {team?.short.slice(0, 3) ?? "?"}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- redireciona para o CDN da Fandom; não precisa de otimização
    <img src={team.logo} alt={team.name} title={team.name} width={size} height={size} className="shrink-0 object-contain drop-shadow-[0_0_1px_rgb(255_255_255/0.7)]" style={{ width: size, height: size }} />
  );
}

/** Logo + sigla (ou nome completo); "A definir" para chaves ainda sem time. */
export function TeamLabel({
  name,
  teams,
  full = false,
  reverse = false,
  dim = false,
}: {
  name: string;
  teams: Record<string, Team>;
  full?: boolean;
  reverse?: boolean;
  dim?: boolean;
}) {
  if (isTbd(name)) return <span className="text-muted">A definir</span>;
  const team = teams[name];
  return (
    <span className={`flex min-w-0 items-center gap-2 ${reverse ? "flex-row-reverse text-right" : ""} ${dim ? "opacity-50" : ""}`}>
      <TeamLogo team={team} />
      <span className="truncate font-medium" title={team?.name ?? name}>
        {full ? (team?.name ?? name) : (team?.short ?? name)}
      </span>
    </span>
  );
}
