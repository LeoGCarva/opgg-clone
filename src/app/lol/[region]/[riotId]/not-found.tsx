import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-6xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Jogador não encontrado</h1>
      <p className="text-zinc-400">Confira o Riot ID (Nome#TAG) e a região.</p>
      <Link href="/" className="text-sky-400 hover:underline">
        Voltar para a busca
      </Link>
    </main>
  );
}
