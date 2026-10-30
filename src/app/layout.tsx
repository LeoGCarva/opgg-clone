import type { Metadata } from "next";
import { Archivo, Instrument_Sans } from "next/font/google";
import Link from "next/link";
import { SearchForm } from "@/components/search-form";
import "./globals.css";

// Títulos e números: Archivo com eixo de largura (wdth 62–125).
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

// Texto, rótulos e botões.
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "rubra",
  description: "Estatísticas de League of Legends",
};

const navLink = "shrink-0 py-5 text-[15px] font-medium text-on-ink hover:text-white";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${instrumentSans.variable} h-full antialiased`}
    >
      {/* Extensões (Grammarly etc.) injetam atributos no body antes da hidratação. */}
      <body
        suppressHydrationWarning
        className="flex min-h-full flex-col bg-canvas font-sans text-ink"
      >
        <header className="bg-ink text-white">
          <div className="mx-auto flex min-h-16 w-full max-w-[1240px] flex-wrap items-center gap-x-8 gap-y-2 px-6">
            <Link
              href="/"
              className="shrink-0 bg-accent px-2 py-1 font-display text-lg leading-none font-black text-ink uppercase [font-stretch:125%]"
            >
              rubra
            </Link>
            <nav aria-label="Principal" className="flex flex-wrap gap-x-6">
              <Link href="/champions" className={navLink}>
                Tier list
              </Link>
              <Link href="/leaderboard" className={navLink}>
                Ranking
              </Link>
              <Link href="/esports/worlds-2026" className={navLink}>
                Worlds 2026
              </Link>
            </nav>
            <div className="ml-auto py-3">
              <SearchForm compact />
            </div>
          </div>
        </header>
        {children}
        <footer className="mt-auto border-t-2 border-ink">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-6 py-5 text-[13px] text-muted">
            <nav aria-label="Rodapé" className="flex gap-4 font-semibold text-ink-soft">
              <Link href="/sobre" className="hover:text-ink hover:underline">
                Sobre o rubra
              </Link>
            </nav>
            {/* Aviso legal exigido pelos termos da API da Riot ("Legal Jibber Jabber"). */}
            <p className="max-w-[900px] text-pretty">
              O rubra não é endossado pela Riot Games e não reflete as visões ou opiniões da Riot Games nem de
              qualquer pessoa oficialmente envolvida na produção ou gestão das propriedades da Riot Games. Riot
              Games e todas as propriedades associadas são marcas comerciais ou marcas registradas da Riot Games, Inc.
            </p>
            <p lang="en" className="max-w-[900px] text-pretty">
              rubra isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or
              anyone officially involved in producing or managing Riot Games properties. Riot Games, and all
              associated properties are trademarks or registered trademarks of Riot Games, Inc.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
