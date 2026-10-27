import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { playerDetail } from "@/components/profile/format";
import { GameIcon } from "@/components/profile/game-icon";
import { TierIcon } from "@/components/profile/tier-icon";
import { ddragonUrl, getStaticData } from "@/lib/ddragon";
import { toRiotIdSlug } from "@/lib/riot/riot-id";
import { isRegionSlug, platformFromSlug } from "@/lib/riot/routing";
import { exactNameInput, findPlayersByName } from "@/lib/services/player-search";

export const metadata: Metadata = { title: "Busca por jogador · rubra" };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <main className="mx-auto w-full max-w-[860px] flex-1 px-6 pt-12 pb-20">
      <Suspense fallback={<div className="h-96 animate-pulse bg-surface" />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SearchResults({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const { region, name } = await searchParams;
  if (typeof region !== "string" || !isRegionSlug(region) || typeof name !== "string" || !exactNameInput(name)) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-3xl">Busca inválida</h1>
        <p className="text-muted">Digite um nome de 3 a 16 caracteres ou o Riot ID completo (Nome#TAG).</p>
        <Link href="/" className="font-semibold hover:underline">
          Voltar para a busca
        </Link>
      </div>
    );
  }

  const displayName = name.trim();
  const [players, data] = await Promise.all([findPlayersByName(platformFromSlug(region), displayName), getStaticData()]);

  return (
    <>
      <p className="text-sm font-semibold text-muted">
        {players.length === 1 ? "1 jogador" : `${players.length} jogadores`} em {region.toUpperCase()}
      </p>
      <h1 className="mt-2 text-[clamp(32px,5vw,56px)] leading-[0.95] break-words">Jogadores chamados “{displayName}”</h1>

      {players.length === 0 ? (
        <div className="mt-8 border border-line bg-surface p-8 text-muted">
          <p className="font-semibold text-ink">
            Nenhum jogador chamado “{displayName}” encontrado em {region.toUpperCase()}.
          </p>
          <p className="mt-2 text-pretty">
            A Riot só busca pelo Riot ID completo. Aqui aparecem os jogadores já buscados no site ou vistos em
            partidas coletadas — tente <span className="font-semibold text-ink">{displayName}#TAG</span>.
          </p>
        </div>
      ) : (
        <ul className="mt-8 border border-line bg-surface">
          {players.map((p, i) => {
            const detail = playerDetail(p);
            return (
              <li key={`${p.tagLine}-${i}`} className="border-t border-divider first:border-t-0">
                <Link
                  href={`/lol/${region}/${toRiotIdSlug(p)}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-canvas"
                >
                  <GameIcon
                    src={p.profileIconId ? ddragonUrl.profileIcon(data.version, p.profileIconId) : null}
                    alt=""
                    size={44}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold">
                      {p.gameName}
                      <span className="font-medium text-muted">#{p.tagLine}</span>
                    </span>
                    {detail && (
                      <span className="flex items-center gap-1 text-[13px] text-muted">
                        {p.tier && <TierIcon tier={p.tier} size={14} />}
                        {detail}
                      </span>
                    )}
                  </span>
                  {p.hasProfile && (
                    <span className="shrink-0 border border-line-strong px-2 py-0.5 text-xs font-semibold">Perfil salvo</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-5 text-[13px] text-muted">
        Lista dos jogadores que já estão no banco do site (buscados ou vistos em partidas coletadas).
      </p>
    </>
  );
}
