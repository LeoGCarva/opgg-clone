import type { leagueEntries } from "@/lib/db/schema";
import { buildLpChart, LP_HISTORY_DAYS, type LpPoint } from "@/lib/services/lp-history";
import { tierLabel, winRate, winRateClass } from "./format";
import { TierIcon } from "./tier-icon";

type LeagueEntry = typeof leagueEntries.$inferSelect;

const TIER_COLORS: Record<string, string> = {
  IRON: "text-elo-iron",
  BRONZE: "text-elo-bronze",
  SILVER: "text-elo-silver",
  GOLD: "text-elo-gold",
  PLATINUM: "text-elo-platinum",
  EMERALD: "text-elo-emerald",
  DIAMOND: "text-elo-diamond",
  MASTER: "text-elo-master",
  GRANDMASTER: "text-elo-grandmaster",
  CHALLENGER: "text-elo-challenger",
};

/**
 * Card de elo de uma fila. Com `collapsible` (Flex) começa recolhido mostrando só ícone, elo e PDL,
 * como no DPM.lol; o resto (V/D, % e gráfico) abre num `<details>` — sem JS no cliente.
 */
export function RankCard({
  title,
  entry,
  history = [],
  collapsible = false,
}: {
  title: string;
  entry?: LeagueEntry;
  history?: LpPoint[];
  collapsible?: boolean;
}) {
  const games = entry ? entry.wins + entry.losses : 0;

  if (collapsible) {
    if (!entry) {
      // Nada para abrir: uma linha só, da mesma altura do card recolhido.
      return (
        <section className="flex items-center gap-3 border border-line bg-surface px-[18px] py-3">
          <TierIcon tier={null} size={32} className="opacity-60" />
          <div>
            <h2 className="font-sans text-xs font-bold text-muted">{title}</h2>
            <p className="text-sm text-muted">Unranked</p>
          </div>
        </section>
      );
    }
    return (
      <details className="group border border-line bg-surface">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-[18px] py-3 hover:bg-canvas [&::-webkit-details-marker]:hidden">
          <TierIcon tier={entry.tier} size={32} />
          <div className="min-w-0 flex-1">
            <h2 className="font-sans text-xs font-bold text-muted">{title}</h2>
            <p className="flex items-baseline gap-1.5 text-sm">
              <span className={`truncate font-display font-extrabold ${TIER_COLORS[entry.tier] ?? ""}`}>
                {tierLabel(entry.tier, entry.rank)}
              </span>
              <span className="whitespace-nowrap text-muted">· {entry.leaguePoints} PDL</span>
            </p>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
          >
            <path d="M6 9 L12 15 L18 9" />
          </svg>
        </summary>
        <div className="border-t border-divider">
          <p className="px-[18px] pt-3 text-right text-[13px] text-muted">{games} jogos</p>
          <RankBody entry={entry} history={history} />
        </div>
      </details>
    );
  }

  return (
    <section className="border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-divider px-[18px] py-3">
        <h2 className="font-sans text-sm font-bold text-ink">{title}</h2>
        {entry && <span className="text-[13px] text-muted">{games} jogos</span>}
      </div>
      {entry ? (
        <RankBody entry={entry} history={history} />
      ) : (
        <p className="flex items-center gap-3 p-[18px] text-muted">
          <TierIcon tier={null} size={40} className="opacity-60" />
          Unranked
        </p>
      )}
    </section>
  );
}

/** Elo, PDL, V/D, % e o gráfico — o corpo do card (aberto ou expandido). */
function RankBody({ entry, history }: { entry: LeagueEntry; history: LpPoint[] }) {
  const wr = winRate(entry.wins, entry.losses);
  return (
    <>
      {/* Cartão estreito: as estatísticas descem para a linha de baixo quando não cabem ao lado. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-[18px]">
        <div className="flex items-center gap-3">
          <TierIcon tier={entry.tier} size={44} />
          <div>
            <p className={`font-display text-[22px] leading-tight font-extrabold [font-stretch:112%] ${TIER_COLORS[entry.tier] ?? ""}`}>
              {tierLabel(entry.tier, entry.rank)}
            </p>
            <p className="text-sm text-muted">{entry.leaguePoints} PDL</p>
          </div>
        </div>
        <div className="ml-auto text-right whitespace-nowrap">
          <p className="text-[13px] text-muted">
            {entry.wins}V {entry.losses}D
          </p>
          <p className={`font-display text-[17px] font-extrabold ${winRateClass(wr)}`}>{wr}%</p>
        </div>
      </div>
      <LpChartSection entry={entry} history={history} />
    </>
  );
}

const WIDTH = 260;
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
const HEIGHT = 112;

/** Gráfico de PDL dos últimos 30 dias: só a linha, o piso da divisão atual, o pico e o ponto de hoje. */
function LpChartSection({ entry, history }: { entry: LeagueEntry; history: LpPoint[] }) {
  const chart = buildLpChart(history, { width: WIDTH, height: HEIGHT });
  if (!chart) {
    return (
      <p className="border-t border-divider px-[18px] py-3 text-[13px] text-muted">
        O gráfico de PDL aparece depois da próxima atualização com mudança de PDL.
      </p>
    );
  }

  const up = chart.delta > 0;
  const deltaText = `${chart.delta > 0 ? "+" : chart.delta < 0 ? "−" : ""}${Math.abs(chart.delta)} PDL`;
  const peak = chart.peak.point;
  const peakLabel = `${tierLabel(peak.tier, peak.rank)} · ${peak.leaguePoints} PDL`;
  const floorLabel = `${tierLabel(entry.tier, entry.rank)} 0`;

  return (
    <div className="flex flex-col gap-3 border-t border-divider p-[18px]">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-muted">Últimos {LP_HISTORY_DAYS} dias</span>
        <span
          className={`flex items-center gap-1 font-display text-[22px] font-extrabold [font-stretch:112%] ${
            chart.delta > 0 ? "text-win" : chart.delta < 0 ? "text-loss" : "text-ink"
          }`}
        >
          {chart.delta !== 0 && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {up ? (
                <>
                  <path d="M12 19 V5" />
                  <path d="M5 12 L12 5 L19 12" />
                </>
              ) : (
                <>
                  <path d="M12 5 V19" />
                  <path d="M5 12 L12 19 L19 12" />
                </>
              )}
            </svg>
          )}
          {deltaText}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`PDL nos últimos ${LP_HISTORY_DAYS} dias: ${deltaText}, pico em ${peakLabel}`}
      >
        {chart.floorY !== null && (
          <>
            <line x1="0" x2={WIDTH} y1={chart.floorY} y2={chart.floorY} stroke="var(--color-line-strong)" strokeDasharray="3 4" />
            <text x={WIDTH} y={chart.floorY - 5} textAnchor="end" fill="var(--color-muted)" fontSize="10" fontWeight="600">
              {floorLabel}
            </text>
          </>
        )}
        <path d={chart.path} fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={chart.peak.x} cy={chart.peak.y} r="3" fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth="1.5" />
        <circle cx={chart.end.x} cy={chart.end.y} r="5" fill="var(--color-accent)" stroke="var(--color-ink)" strokeWidth="2" />
      </svg>

      <div className="flex justify-between text-xs text-muted">
        <span>{shortDate.format(history[0].recordedAt)}</span>
        <span>{shortDate.format(history[history.length - 1].recordedAt)}</span>
      </div>

      <p className="flex items-baseline justify-between gap-3 border-t border-divider pt-3 text-xs font-semibold text-muted">
        Pico
        <span className="font-display text-sm font-extrabold text-ink">{peakLabel}</span>
      </p>
    </div>
  );
}
