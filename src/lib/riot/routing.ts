// A Riot separa os hosts em "plataformas" (servidor do jogo: br1, na1...)
// e "regiões" (agrupamentos usados por account-v1 e match-v5).

export const PLATFORMS = [
  "br1", "la1", "la2", "na1", "oc1",
  "euw1", "eun1", "tr1", "ru", "me1",
  "kr", "jp1",
  "sg2", "tw2", "vn2",
] as const;
export type Platform = (typeof PLATFORMS)[number];

export type Region = "americas" | "europe" | "asia" | "sea";

const PLATFORM_TO_REGION: Record<Platform, Region> = {
  br1: "americas", la1: "americas", la2: "americas", na1: "americas",
  oc1: "sea",
  euw1: "europe", eun1: "europe", tr1: "europe", ru: "europe", me1: "europe",
  kr: "asia", jp1: "asia",
  sg2: "sea", tw2: "sea", vn2: "sea",
};

// Slug usado na URL do site (/lol/br/Nome-TAG), no mesmo estilo do op.gg.
const SLUG_TO_PLATFORM = {
  br: "br1", lan: "la1", las: "la2", na: "na1", oce: "oc1",
  euw: "euw1", eune: "eun1", tr: "tr1", ru: "ru", me: "me1",
  kr: "kr", jp: "jp1",
  sg: "sg2", tw: "tw2", vn: "vn2",
} as const satisfies Record<string, Platform>;

export type RegionSlug = keyof typeof SLUG_TO_PLATFORM;
export const REGION_SLUGS = Object.keys(SLUG_TO_PLATFORM) as RegionSlug[];

export function isRegionSlug(value: string): value is RegionSlug {
  return value in SLUG_TO_PLATFORM;
}

export function platformFromSlug(slug: RegionSlug): Platform {
  return SLUG_TO_PLATFORM[slug];
}

export function regionOf(platform: Platform): Region {
  return PLATFORM_TO_REGION[platform];
}

// account-v1 não atende "sea"; qualquer cluster serve, pois contas são globais.
export function accountRegionOf(platform: Platform): Exclude<Region, "sea"> {
  const region = regionOf(platform);
  return region === "sea" ? "asia" : region;
}

export type RoutingHost = Platform | Region;

export function hostUrl(host: RoutingHost): string {
  return `https://${host}.api.riotgames.com`;
}
