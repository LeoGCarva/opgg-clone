// Monta links dos filtros (sem parâmetros vazios). Separado de filters.tsx para o campo de
// busca (client component) não importar o módulo de stats, que lê o banco.
export type Query = Record<string, string | undefined>;

export function href(basePath: string, params: Query) {
  const query = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => !!e[1]),
  ).toString();
  return query ? `${basePath}?${query}` : basePath;
}
