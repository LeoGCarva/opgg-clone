import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Sobre · rubra" };

const REPO_URL = "https://github.com/LeoGCarva/opgg-clone";

// Página estática: o que o site faz, de onde vêm os dados e o que é guardado.
// Também serve de referência para a revisão da Riot ao pedir a chave da API.
export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] flex-1 px-6 pt-12 pb-20">
      <p className="text-sm font-semibold text-muted">Projeto de estudo · gratuito · sem anúncios</p>
      <h1 className="mt-2 text-[clamp(40px,6vw,72px)] leading-[0.95]">Sobre o rubra</h1>

      <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-ink-soft [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:text-ink [&_a]:font-semibold [&_a]:text-ink [&_a]:underline">
        <section>
          <h2>O que é</h2>
          <p>
            O rubra é um site de estatísticas de League of Legends feito por um fã, para aprender e para ajudar
            jogadores a entender o próprio desempenho. Ele mostra:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>o perfil de um jogador (elo, histórico de partidas, campeões e builds que ele usa);</li>
            <li>
              uma <Link href="/champions">tier list</Link> e páginas de campeão com runas, itens, habilidades e
              confrontos, a partir de partidas ranqueadas de Esmeralda para cima;
            </li>
            <li>
              o <Link href="/leaderboard">ranking</Link> oficial de Desafiante, Grão-Mestre e Mestre de cada região;
            </li>
            <li>
              resultados e estatísticas do <Link href="/esports/worlds-2026">Worlds 2026</Link>.
            </li>
          </ul>
          <p className="mt-2">
            Tudo é gratuito e aberto a todos. Não há contas, anúncios nem conteúdo exclusivo, e o site não faz nada
            durante as partidas.
          </p>
        </section>

        <section>
          <h2>De onde vêm os dados</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-ink">API oficial da Riot Games</strong>: contas, elo, partidas e ranking. A
              chave da API fica só no servidor.
            </li>
            <li>
              <strong className="text-ink">Data Dragon</strong> (Riot Games): nomes e imagens de campeões, itens,
              runas e feitiços.
            </li>
            <li>
              <strong className="text-ink">Leaguepedia</strong> (CC BY-SA 3.0): calendário e resultados do Worlds.
            </li>
            <li>
              Ícones de elo: arte do cliente do jogo, obtida via Community Dragon.
            </li>
          </ul>
        </section>

        <section>
          <h2>O que é guardado</h2>
          <p>
            Só dados públicos do jogo: o Riot ID, o elo e as partidas de quem é buscado no site, e partidas
            ranqueadas usadas nas estatísticas globais. Não há login, cookies de rastreamento nem coleta de dados
            pessoais. As buscas recentes ficam apenas no seu navegador.
          </p>
          <p className="mt-2">
            Quer que seus dados sejam removidos? Abra uma issue no{" "}
            <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">
              repositório do projeto
            </a>
            .
          </p>
        </section>

        <section>
          <h2>Contato e código</h2>
          <p>
            O código é aberto no{" "}
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
            . Sugestões e problemas também podem ser enviados por lá.
          </p>
        </section>

        <section className="border-t border-line pt-6 text-[13px] text-muted">
          <p>
            O rubra não é endossado pela Riot Games e não reflete as visões ou opiniões da Riot Games nem de
            qualquer pessoa oficialmente envolvida na produção ou gestão das propriedades da Riot Games. Riot Games
            e todas as propriedades associadas são marcas comerciais ou marcas registradas da Riot Games, Inc.
          </p>
        </section>
      </div>
    </main>
  );
}
