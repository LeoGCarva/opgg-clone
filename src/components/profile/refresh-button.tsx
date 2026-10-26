"use client";

import { useActionState } from "react";
import type { RefreshState } from "@/app/lol/[region]/[riotId]/actions";

type Props = {
  action: (prev: RefreshState, formData: FormData) => Promise<RefreshState>;
};

export function RefreshButton({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
      >
        {pending ? "Atualizando..." : "Atualizar"}
      </button>
      {!pending && state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {!pending && state.message && <p className="text-sm text-zinc-400">{state.message}</p>}
    </form>
  );
}
