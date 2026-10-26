import { cacheLife } from "next/cache";

// Data Dragon: CDN oficial da Riot com imagens e dados estáticos por patch.
const DDRAGON = "https://ddragon.leagueoflegends.com";
const LOCALE = "pt_BR";

type Named = { name: string; image: string };

export type ItemInfo = {
  name: string;
  gold: number; // custo total
  tags: string[]; // "Boots", "Consumable", "Trinket"...
  into?: string[]; // ids dos itens em que ele evolui; ausente = item final
};

export type StaticData = {
  version: string;
  champions: Record<number, Named>; // por championId (campo "key" do champion.json)
  spells: Record<number, Named>; // por summoner1Id/summoner2Id
  items: Record<number, ItemInfo>;
  runes: Record<number, Named>; // keystones e estilos, por id
  queues: Record<number, string>;
};

// A Riot não tem nomes em português para filas; os mais comuns traduzimos aqui.
const QUEUE_NAMES_PT: Record<number, string> = {
  400: "Normal Draft",
  420: "Ranqueada Solo/Duo",
  430: "Normal Blind",
  440: "Ranqueada Flex",
  450: "ARAM",
  480: "Swiftplay",
  490: "Normal (Quickplay)",
  700: "Clash",
  900: "URF",
  1700: "Arena",
  // Filas novas de Arena (gameMode "CHERRY", mapa 30), ainda fora do queues.json.
  1740: "Arena",
  1750: "Arena",
  1900: "URF",
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Data Dragon respondeu ${res.status} em ${url}`);
  return res.json() as Promise<T>;
}

/** Versão com cache do Next, para as páginas. */
export async function getStaticData(): Promise<StaticData> {
  "use cache";
  cacheLife("days");
  return fetchStaticData();
}

/** Sem cache: usada também pelos scripts (coletor/agregador), que rodam fora do Next. */
export async function fetchStaticData(): Promise<StaticData> {
  const [version] = await getJson<string[]>(`${DDRAGON}/api/versions.json`);
  const data = `${DDRAGON}/cdn/${version}/data/${LOCALE}`;

  type DdragonEntry = { id: string; key: string; name: string; image: { full: string } };
  type RuneStyle = {
    id: number;
    name: string;
    icon: string;
    slots: { runes: { id: number; name: string; icon: string }[] }[];
  };

  const [championJson, summonerJson, itemJson, runeStyles, queueList] = await Promise.all([
    getJson<{ data: Record<string, DdragonEntry> }>(`${data}/champion.json`),
    getJson<{ data: Record<string, DdragonEntry> }>(`${data}/summoner.json`),
    getJson<{
      data: Record<string, { name: string; gold: { total: number }; tags: string[]; into?: string[] }>;
    }>(`${data}/item.json`),
    getJson<RuneStyle[]>(`${data}/runesReforged.json`),
    getJson<{ queueId: number; description: string | null }[]>(
      "https://static.developer.riotgames.com/docs/lol/queues.json",
    ).catch(() => []),
  ]);

  const byKey = (entries: Record<string, DdragonEntry>) =>
    Object.fromEntries(
      Object.values(entries).map((e) => [Number(e.key), { name: e.name, image: e.image.full }]),
    );

  const runes: StaticData["runes"] = {};
  for (const style of runeStyles) {
    runes[style.id] = { name: style.name, image: style.icon };
    for (const rune of style.slots.flatMap((s) => s.runes)) {
      runes[rune.id] = { name: rune.name, image: rune.icon };
    }
  }

  const queues: StaticData["queues"] = {};
  for (const q of queueList) {
    if (q.description) queues[q.queueId] = q.description.replace(/ games$/, "");
  }
  Object.assign(queues, QUEUE_NAMES_PT);

  return {
    version,
    champions: byKey(championJson.data),
    spells: byKey(summonerJson.data),
    items: Object.fromEntries(
      Object.entries(itemJson.data).map(([id, i]) => [
        Number(id),
        { name: i.name, gold: i.gold.total, tags: i.tags, into: i.into },
      ]),
    ),
    runes,
    queues,
  };
}

export const ddragonUrl = {
  profileIcon: (version: string, id: number) => `${DDRAGON}/cdn/${version}/img/profileicon/${id}.png`,
  champion: (version: string, image: string) => `${DDRAGON}/cdn/${version}/img/champion/${image}`,
  spell: (version: string, image: string) => `${DDRAGON}/cdn/${version}/img/spell/${image}`,
  item: (version: string, id: number) => `${DDRAGON}/cdn/${version}/img/item/${id}.png`,
  // Ícones de runa não são versionados.
  rune: (image: string) => `${DDRAGON}/cdn/img/${image}`,
};

/** Slug de URL do campeão: o id do Data Dragon em minúsculas ("MonkeyKing" → "monkeyking"). */
export function championSlug(data: StaticData, championId: number): string | null {
  const champion = data.champions[championId];
  return champion ? champion.image.replace(/\.png$/, "").toLowerCase() : null;
}

export function championIdBySlug(data: StaticData, slug: string): number | null {
  const entry = Object.entries(data.champions).find(
    ([, c]) => c.image.replace(/\.png$/, "").toLowerCase() === slug.toLowerCase(),
  );
  return entry ? Number(entry[0]) : null;
}

export function queueName(data: StaticData, queueId: number): string {
  return data.queues[queueId] ?? `Fila ${queueId}`;
}
