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

/** Árvore de runas com as fileiras na ordem do jogo (fileira 0 = keystones). */
export type RuneTree = { id: number; name: string; image: string; slots: number[][] };

export type StaticData = {
  version: string;
  champions: Record<number, Named>; // por championId (campo "key" do champion.json)
  spells: Record<number, Named>; // por summoner1Id/summoner2Id
  items: Record<number, ItemInfo>;
  runes: Record<number, Named>; // keystones e estilos, por id
  runeTrees: RuneTree[];
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
    runeTrees: runeStyles.map((s) => ({
      id: s.id,
      name: s.name,
      image: s.icon,
      slots: s.slots.map((slot) => slot.runes.map((r) => r.id)),
    })),
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

// Fragmentos não estão no runesReforged.json; as fileiras são ataque, flex e defesa.
const shard = (name: string, icon: string): Named => ({ name, image: `perk-images/StatMods/StatMods${icon}Icon.png` });
export const STAT_SHARDS: Record<number, Named> = {
  5008: shard("Força Adaptativa", "AdaptiveForce"),
  5005: shard("Velocidade de Ataque", "AttackSpeed"),
  5007: shard("Aceleração de Habilidade", "CDRScaling"),
  5010: shard("Velocidade de Movimento", "MovementSpeed"),
  5001: shard("Vida por nível", "HealthPlus"),
  5011: shard("Vida", "HealthScaling"),
  5013: shard("Tenacidade e Resistência a Lentidão", "Tenacity"),
};
export const STAT_SHARD_ROWS = [
  [5008, 5005, 5007],
  [5008, 5010, 5001],
  [5011, 5013, 5001],
];

export type ChampionSpell = Named & { key: "Q" | "W" | "E" | "R" };

/** Habilidades Q/W/E/R do campeão; `ddragonId` é o id do Data Dragon ("MonkeyKing"). */
export async function getChampionSpells(ddragonId: string): Promise<ChampionSpell[]> {
  "use cache";
  cacheLife("days");
  const [version] = await getJson<string[]>(`${DDRAGON}/api/versions.json`);
  const json = await getJson<{ data: Record<string, { spells: { name: string; image: { full: string } }[] }> }>(
    `${DDRAGON}/cdn/${version}/data/${LOCALE}/champion/${ddragonId}.json`,
  );
  const keys = ["Q", "W", "E", "R"] as const;
  return json.data[ddragonId].spells.map((s, i) => ({ key: keys[i], name: s.name, image: s.image.full }));
}

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

// ---- Nomes em inglês → ids (dados de esports da Leaguepedia vêm em inglês) ----

export type NameIndex = {
  champions: Record<string, number>;
  items: Record<string, number>;
  spells: Record<string, number>;
  runes: Record<string, number>; // keystones, runas e árvores
};

/** Chave de comparação: sem acentos, espaços e pontuação ("Kai'Sa" → "kaisa"). */
export function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
}

type NamedEntry = { id: number; name: string; preferred: boolean };

/** Monta o índice; com nomes repetidos, fica a versão de Summoner's Rift e, depois, o menor id. */
export function buildNameIndex(groups: Record<keyof NameIndex, NamedEntry[]>): NameIndex {
  const build = (entries: NamedEntry[]) => {
    const index: Record<string, number> = {};
    const sorted = [...entries].sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.id - b.id);
    for (const e of sorted) index[nameKey(e.name)] ??= e.id;
    return index;
  };
  return {
    champions: build(groups.champions),
    items: build(groups.items),
    spells: build(groups.spells),
    runes: build(groups.runes),
  };
}

export async function getNameIndex(): Promise<NameIndex> {
  "use cache";
  cacheLife("days");

  const [version] = await getJson<string[]>(`${DDRAGON}/api/versions.json`);
  const data = `${DDRAGON}/cdn/${version}/data/en_US`;
  const [champions, summoners, items, runeStyles] = await Promise.all([
    getJson<{ data: Record<string, { key: string; name: string }> }>(`${data}/champion.json`),
    getJson<{ data: Record<string, { key: string; name: string; modes: string[] }> }>(`${data}/summoner.json`),
    getJson<{ data: Record<string, { name: string; maps: Record<string, boolean> }> }>(`${data}/item.json`),
    getJson<{ id: number; name: string; slots: { runes: { id: number; name: string }[] }[] }[]>(
      `${data}/runesReforged.json`,
    ),
  ]);

  return buildNameIndex({
    champions: Object.values(champions.data).map((c) => ({ id: Number(c.key), name: c.name, preferred: true })),
    spells: Object.values(summoners.data).map((s) => ({
      id: Number(s.key),
      name: s.name,
      preferred: s.modes.includes("CLASSIC"),
    })),
    items: Object.entries(items.data).map(([id, i]) => ({ id: Number(id), name: i.name, preferred: !!i.maps["11"] })),
    runes: runeStyles.flatMap((style) => [
      { id: style.id, name: style.name, preferred: true },
      ...style.slots.flatMap((s) => s.runes.map((r) => ({ id: r.id, name: r.name, preferred: true }))),
    ]),
  });
}
