import Link from "next/link";
import { roleLabel } from "@/components/profile/format";
import { GLOBAL_BRACKETS, ROLES, type GlobalBracket, type Role } from "@/lib/services/global-stats";
import { TIERS, tierFilterParam } from "@/lib/services/tier-filters";
import type { Tier } from "@/lib/services/tiers";
import { TierIcon } from "@/components/profile/tier-icon";
import { href, type Query } from "./href";


// Botões de filtro do guia: altura 44, padding 0 16, 14px/600; ativo em ink.
export const pill = (active: boolean) =>
  `flex h-11 items-center border px-4 text-sm font-semibold ${
    active ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink hover:border-ink"
  }`;

// Ícone de cada aba de elo; "Todos" fica sem.
const BRACKET_ICON: Record<GlobalBracket, string | null> = { all: null, diamond: "DIAMOND", master_plus: "MASTER" };

/** Abas de elo; preserva a rota (e, na tier list, os outros filtros via `query`). */
export function BracketTabs({
  basePath,
  active,
  role,
  view,
  query,
}: {
  basePath: string;
  active: GlobalBracket;
  role?: string;
  view?: string;
  query?: Query;
}) {
  return (
    <nav aria-label="Elo" className="flex flex-wrap gap-1.5">
      {(Object.keys(GLOBAL_BRACKETS) as GlobalBracket[]).map((b) => (
        <Link
          key={b}
          href={href(basePath, { ...query, bracket: b === "all" ? undefined : b, role, view })}
          aria-current={b === active ? "page" : undefined}
          className={`${pill(b === active)} gap-2`}
        >
          {BRACKET_ICON[b] && <TierIcon tier={BRACKET_ICON[b]} size={20} />}
          {GLOBAL_BRACKETS[b]}
        </Link>
      ))}
    </nav>
  );
}

/** Abas de rota; `roles` limita às rotas disponíveis (página do campeão). */
export function RoleTabs({
  basePath,
  active,
  bracket,
  roles = ROLES,
  allowAll = true,
  view,
  query,
}: {
  basePath: string;
  active?: Role;
  bracket: GlobalBracket;
  roles?: readonly Role[];
  allowAll?: boolean;
  view?: string;
  query?: Query;
}) {
  const bracketParam = bracket === "all" ? undefined : bracket;
  return (
    <nav aria-label="Rota" className="flex flex-wrap gap-1.5">
      {allowAll && (
        <Link
          href={href(basePath, { ...query, bracket: bracketParam, view })}
          aria-current={!active ? "page" : undefined}
          className={pill(!active)}
        >
          Todas
        </Link>
      )}
      {roles.map((r) => (
        <Link
          key={r}
          href={href(basePath, { ...query, bracket: bracketParam, role: r, view })}
          aria-current={r === active ? "page" : undefined}
          className={pill(r === active)}
        >
          {roleLabel(r)}
        </Link>
      ))}
    </nav>
  );
}

/** Alternância Tabela / Por tier da tier list; ativo em acento. */
export function ViewToggle({
  basePath,
  active,
  bracket,
  role,
  query,
}: {
  basePath: string;
  active: "table" | "tiers";
  bracket: GlobalBracket;
  role?: string;
  query?: Query;
}) {
  const bracketParam = bracket === "all" ? undefined : bracket;
  const views = [
    { value: "table", label: "Tabela" },
    { value: "tiers", label: "Por tier" },
  ] as const;
  return (
    <nav aria-label="Visualização" className="flex border border-ink">
      {views.map((v) => (
        <Link
          key={v.value}
          href={href(basePath, { ...query, bracket: bracketParam, role, view: v.value === "table" ? undefined : v.value })}
          aria-current={v.value === active ? "page" : undefined}
          className={`flex h-[42px] items-center px-4 text-sm font-semibold text-ink ${
            v.value === active ? "bg-accent" : "bg-surface hover:bg-canvas"
          }`}
        >
          {v.label}
        </Link>
      ))}
    </nav>
  );
}

/** Chips de tier: cada um liga/desliga o seu tier; "Todos" limpa o filtro. `query` = filtros atuais sem `tier`. */
export function TierChips({ basePath, active, query }: { basePath: string; active: readonly Tier[]; query: Query }) {
  const toggle = (t: Tier) => (active.includes(t) ? active.filter((a) => a !== t) : TIERS.filter((x) => x === t || active.includes(x)));
  return (
    <nav aria-label="Tier" className="flex flex-wrap gap-1.5">
      <Link href={href(basePath, query)} aria-current={!active.length ? "page" : undefined} className={pill(!active.length)}>
        Todos
      </Link>
      {TIERS.map((t) => (
        <Link
          key={t}
          href={href(basePath, { ...query, tier: tierFilterParam(toggle(t)) })}
          aria-current={active.includes(t) ? "true" : undefined}
          className={`${pill(active.includes(t))} min-w-11 justify-center font-display font-extrabold`}
        >
          {t}
        </Link>
      ))}
    </nav>
  );
}
