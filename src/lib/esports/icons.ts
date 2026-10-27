import { championSlug, ddragonUrl, nameKey, type NameIndex, type StaticData } from "@/lib/ddragon";

// Resolve nomes em inglês da Leaguepedia para ícone + nome em português do Data Dragon.
// Nome desconhecido (ex.: campeão mais novo que o Data Dragon) → mantém o nome, sem ícone.

export type IconRef = { name: string; src: string | null; slug?: string | null };

export type Icons = ReturnType<typeof makeIcons>;

export function makeIcons(data: StaticData, index: NameIndex) {
  const id = (map: Record<string, number>, name: string) => map[nameKey(name)];

  return {
    champion(name: string): IconRef {
      const championId = id(index.champions, name);
      const c = championId != null ? data.champions[championId] : undefined;
      return c
        ? { name: c.name, src: ddragonUrl.champion(data.version, c.image), slug: championSlug(data, championId) }
        : { name, src: null };
    },
    item(name: string): IconRef {
      const itemId = id(index.items, name);
      const item = itemId != null ? data.items[itemId] : undefined;
      return item ? { name: item.name, src: ddragonUrl.item(data.version, itemId) } : { name, src: null };
    },
    spell(name: string): IconRef {
      const spellId = id(index.spells, name);
      const spell = spellId != null ? data.spells[spellId] : undefined;
      return spell ? { name: spell.name, src: ddragonUrl.spell(data.version, spell.image) } : { name, src: null };
    },
    rune(name: string): IconRef {
      const runeId = id(index.runes, name);
      const rune = runeId != null ? data.runes[runeId] : undefined;
      return rune ? { name: rune.name, src: ddragonUrl.rune(rune.image) } : { name, src: null };
    },
  };
}
