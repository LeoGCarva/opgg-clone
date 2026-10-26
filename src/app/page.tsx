import { SearchForm } from "@/components/search-form";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">opgg clone</h1>
        <p className="mt-2 text-zinc-400">Busque um jogador pelo Riot ID.</p>
      </div>
      <SearchForm />
    </main>
  );
}
