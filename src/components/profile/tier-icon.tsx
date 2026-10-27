// "Mini crests" do cliente do LoL (Riot, via Community Dragon), copiados para public/ranked/.
const TIERS = new Set([
  "IRON",
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "EMERALD",
  "DIAMOND",
  "MASTER",
  "GRANDMASTER",
  "CHALLENGER",
]);

/** Ícone do elo (tier da Riot, ex. "CHALLENGER"); sem tier ou desconhecido = Unranked. Decorativo por padrão. */
export function TierIcon({ tier, size = 20, alt = "", className = "" }: { tier: string | null | undefined; size?: number; alt?: string; className?: string }) {
  const file = tier && TIERS.has(tier) ? tier.toLowerCase() : "unranked";
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG local de ~2 KB, não precisa de otimização
    <img
      src={`/ranked/${file}.svg`}
      alt={alt}
      width={size}
      height={size}
      className={`inline-block shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
