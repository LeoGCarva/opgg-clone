/** Tela de carregamento com a marca, para rotas sem esqueleto próprio (`app/loading.tsx`). */
export function LoadingScreen({ label = "Carregando…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-5 px-6">
      <span className="bg-accent px-3 py-1.5 font-display text-3xl leading-none font-black text-ink uppercase [font-stretch:125%]">
        rubra
      </span>
      <span aria-hidden="true" className="relative h-1 w-40 overflow-hidden bg-line">
        <span className="absolute inset-y-0 left-0 w-2/5 animate-loading-bar bg-ink motion-reduce:hidden" />
      </span>
      <span className="text-sm font-medium text-muted">{label}</span>
    </div>
  );
}
