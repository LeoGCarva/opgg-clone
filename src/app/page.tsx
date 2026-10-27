import Link from "next/link";
import { SearchForm } from "@/components/search-form";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col justify-center gap-10 px-6 py-20">
      <h1 className="max-w-[1000px] text-[clamp(44px,7.5vw,112px)] leading-[0.9] text-balance">
        Encontre qualquer <span className="bg-accent px-[0.08em]">jogador</span>.
      </h1>
      <div className="w-full max-w-[860px]">
        <SearchForm />
      </div>
      <Link href="/champions" className="flex w-fit items-center gap-1.5 text-[15px] font-bold hover:underline">
        Ver a tier list do patch
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12 H19" />
          <path d="M13 6 L19 12 L13 18" />
        </svg>
      </Link>
    </main>
  );
}
