"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useTransition, type MouseEvent, type ReactNode } from "react";
import type { QueueFilter } from "@/lib/services/profile";

export const QUEUE_TABS: { value: QueueFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "solo", label: "Solo/Duo" },
  { value: "flex", label: "Flex" },
];

type QueueNav = {
  pending: boolean;
  target: QueueFilter | null;
  navigate: (value: QueueFilter, href: string) => void;
};

const QueueNavContext = createContext<QueueNav | null>(null);

/**
 * Troca de fila numa transição: `pending` fica true até a página nova renderizar
 * (o servidor refaz as consultas), e o conteúdo abaixo das abas mostra um esqueleto.
 */
export function QueueTabsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<QueueFilter | null>(null);

  function navigate(value: QueueFilter, href: string) {
    setTarget(value);
    startTransition(() => router.push(href, { scroll: false }));
  }

  return (
    <QueueNavContext.Provider value={{ pending, target: pending ? target : null, navigate }}>
      {children}
    </QueueNavContext.Provider>
  );
}

/** Mostra `fallback` enquanto a fila nova carrega. */
export function QueueTabsContent({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const nav = useContext(QueueNavContext);
  return nav?.pending ? fallback : children;
}

export function QueueTabs({ basePath, active }: { basePath: string; active: QueueFilter }) {
  const nav = useContext(QueueNavContext);
  // A aba clicada já fica ativa enquanto carrega.
  const shown = nav?.target ?? active;

  return (
    <nav className="flex gap-1 border border-line bg-surface p-1 text-sm" aria-busy={nav?.pending || undefined}>
      {QUEUE_TABS.map((tab) => {
        const href = tab.value === "all" ? basePath : `${basePath}?queue=${tab.value}`;
        const isShown = tab.value === shown;
        const loading = nav?.pending && nav.target === tab.value;

        function onClick(e: MouseEvent<HTMLAnchorElement>) {
          // Ctrl/Cmd/Shift+clique e botão do meio seguem o comportamento normal do link (nova aba etc.).
          if (!nav || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          if (tab.value !== active || nav.pending) nav.navigate(tab.value, href);
        }

        return (
          <Link
            key={tab.value}
            href={href}
            onClick={onClick}
            aria-current={tab.value === active ? "page" : undefined}
            className={`relative flex h-11 items-center px-4 font-semibold ${
              isShown ? "bg-ink text-white" : "text-ink hover:bg-canvas"
            }`}
          >
            {tab.label}
            {/* Fica no padding da direita e só muda a opacidade: não mexe no layout. */}
            <span
              aria-hidden="true"
              className={`absolute top-1/2 right-1 size-2 -translate-y-1/2 rounded-full border-[1.5px] border-white/40 border-t-white motion-safe:animate-spin ${
                loading ? "opacity-100" : "opacity-0"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
