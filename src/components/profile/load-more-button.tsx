"use client";

import { useActionState } from "react";
import type { RefreshState } from "@/app/lol/[region]/[riotId]/actions";

type Props = {
  action: (prev: RefreshState, formData: FormData) => Promise<RefreshState>;
};

export function LoadMoreButton({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col items-center gap-2 pt-2">
      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full border-2 border-ink bg-surface text-[15px] font-bold text-ink hover:bg-canvas disabled:opacity-50"
      >
        {pending ? "Buscando partidas antigas..." : "Carregar mais"}
      </button>
      {!pending && state.error && <p className="text-sm text-loss">{state.error}</p>}
    </form>
  );
}
