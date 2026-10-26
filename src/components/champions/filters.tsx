import Link from "next/link";
import { roleLabel } from "@/components/profile/format";
import { GLOBAL_BRACKETS, ROLES, type GlobalBracket, type Role } from "@/lib/services/global-stats";

function href(basePath: string, params: Record<string, string | undefined>) {
  const query = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => !!e[1]),
  ).toString();
  return query ? `${basePath}?${query}` : basePath;
}

const pill = (active: boolean) =>
  `rounded-md px-3 py-1.5 text-sm ${active ? "bg-zinc-800 font-medium text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`;

/** Abas de elo; preserva a rota escolhida. */
export function BracketTabs({ basePath, active, role }: { basePath: string; active: GlobalBracket; role?: string }) {
  return (
    <nav className="flex flex-wrap gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
      {(Object.keys(GLOBAL_BRACKETS) as GlobalBracket[]).map((b) => (
        <Link key={b} href={href(basePath, { bracket: b === "all" ? undefined : b, role })} className={pill(b === active)}>
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
}: {
  basePath: string;
  active?: Role;
  bracket: GlobalBracket;
  roles?: readonly Role[];
  allowAll?: boolean;
}) {
  const bracketParam = bracket === "all" ? undefined : bracket;
  return (
    <nav className="flex flex-wrap gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
      {allowAll && (
        <Link href={href(basePath, { bracket: bracketParam })} className={pill(!active)}>
          Todas
        </Link>
      )}
      {roles.map((r) => (
        <Link key={r} href={href(basePath, { bracket: bracketParam, role: r })} className={pill(r === active)}>
          {roleLabel(r)}
        </Link>
      ))}
    </nav>
  );
}
