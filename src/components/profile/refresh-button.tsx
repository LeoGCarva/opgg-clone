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
        className="h-11 bg-ink px-5 text-[15px] font-semibold text-white hover:bg-ink-soft disabled:opacity-50"
      >
        {pending ? "Atualizando..." : "Atualizar"}
      </button>
      {!pending && state.error && <p className="text-sm text-loss">{state.error}</p>}
      {!pending && state.message && <p className="text-sm text-muted">{state.message}</p>}
    </form>
  );
}
