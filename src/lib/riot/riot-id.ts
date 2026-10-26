export type RiotId = { gameName: string; tagLine: string };

const TAG_LINE = /^[\p{L}\p{N}]{3,5}$/u;

function build(gameName: string, tagLine: string): RiotId | null {
  const name = gameName.trim();
  const tag = tagLine.trim();
  if (name.length < 3 || name.length > 16 || !TAG_LINE.test(tag)) return null;
  return { gameName: name, tagLine: tag };
}

/** Entrada do usuário: "Nome#TAG". */
export function parseRiotId(input: string): RiotId | null {
  const i = input.lastIndexOf("#");
  if (i === -1) return null;
  return build(input.slice(0, i), input.slice(i + 1));
}

/** Segmento da URL: "Nome-TAG". O nome pode ter espaços, a tag nunca tem hífen. */
export function parseRiotIdSlug(slug: string): RiotId | null {
  const decoded = decodeURIComponent(slug);
  const i = decoded.lastIndexOf("-");
  if (i === -1) return null;
  return build(decoded.slice(0, i), decoded.slice(i + 1));
}

export function toRiotIdSlug({ gameName, tagLine }: RiotId): string {
  return encodeURIComponent(`${gameName}-${tagLine}`);
}
