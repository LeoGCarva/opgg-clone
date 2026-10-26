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
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Buscando partidas antigas..." : "Carregar mais"}
      </button>
      {!pending && state.error && <p className="text-sm text-red-400">{state.error}</p>}
    </form>
  );
}
