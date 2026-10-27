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
  title: "opgg clone",
  description: "Estatísticas de League of Legends",
};

const navLink = "shrink-0 py-5 text-[15px] font-medium text-on-ink hover:text-white";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${instrumentSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas font-sans text-ink">
        <header className="bg-ink text-white">
          <div className="mx-auto flex min-h-16 w-full max-w-[1240px] flex-wrap items-center gap-x-8 gap-y-2 px-6">
            <Link
              href="/"
              className="shrink-0 bg-accent px-2 py-1 font-display text-lg leading-none font-black text-ink uppercase [font-stretch:125%]"
            >
              opgg clone
            </Link>
            <nav aria-label="Principal" className="flex flex-wrap gap-x-6">
              <Link href="/champions" className={navLink}>
                Tier list
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
          <p className="mx-auto max-w-[1240px] px-6 py-5 text-[13px] text-muted">
            Projeto não oficial, sem vínculo com a Riot Games.
          </p>
        </footer>
      </body>
    </html>
  );
}
