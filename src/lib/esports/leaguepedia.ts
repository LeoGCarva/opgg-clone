import Bottleneck from "bottleneck";
import { env } from "@/env";

// Cliente da API Cargo da Leaguepedia (lol.fandom.com): dados de esports de LoL, licença CC BY-SA.
// A wiki limita bastante o acesso anônimo, então entramos com um bot password
// (LEAGUEPEDIA_USER/PASSWORD) e guardamos os cookies da sessão. Mesmo logado: uma requisição
// por vez, espaçadas, e espera + nova tentativa quando ela responde "ratelimited".
// Quem chama deve fazer cache dos resultados.

const API = "https://lol.fandom.com/api.php";
const USER_AGENT = "rubra/1.0 (https://github.com/LeoGCarva/opgg-clone)";
const PAGE_SIZE = 500; // máximo por requisição da Cargo
const MAX_RETRIES = 4;

export class LeaguepediaError extends Error {
  name = "LeaguepediaError";
}

export type CargoQuery = {
  tables: string;
  fields: string;
  where?: string;
  joinOn?: string;
  orderBy?: string;
};

type ApiResponse = {
  cargoquery?: { title: Record<string, string | null> }[];
  query?: {
    normalized?: { from: string; to: string }[];
    pages?: Record<string, { title: string; imageinfo?: { url: string }[] }>;
  };
  error?: { code: string; info: string };
};

const limiter = new Bottleneck({ maxConcurrent: 1, minTime: 1500 });
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Cookies da sessão (nome → valor). O fetch do Node não tem cookie jar.
const cookies = new Map<string, string>();
let session: Promise<void> | undefined;

function storeCookies(res: Response) {
  for (const header of res.headers.getSetCookie()) {
    const [pair] = header.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

async function wikiFetch(params: Record<string, string>, body?: Record<string, string>) {
  const res = await limiter.schedule(() =>
    fetch(`${API}?${new URLSearchParams({ format: "json", ...params })}`, {
      method: body ? "POST" : "GET",
      headers: {
        "User-Agent": USER_AGENT,
        ...(cookies.size && { Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") }),
      },
      body: body && new URLSearchParams(body),
    }),
  );
  storeCookies(res);
  return res;
}

async function login() {
  const { LEAGUEPEDIA_USER: user, LEAGUEPEDIA_PASSWORD: password } = env();
  if (!user || !password) return; // segue anônimo (e sujeito ao limite)

  const tokenRes = await wikiFetch({ action: "query", meta: "tokens", type: "login" });
  const token = ((await tokenRes.json()) as { query?: { tokens?: { logintoken?: string } } }).query
    ?.tokens?.logintoken;
  if (!token) throw new LeaguepediaError("Leaguepedia: não veio token de login");

  const loginRes = await wikiFetch(
    { action: "login" },
    { lgname: user, lgpassword: password, lgtoken: token },
  );
  const result = ((await loginRes.json()) as { login?: { result?: string; reason?: string } }).login;
  if (result?.result !== "Success") {
    throw new LeaguepediaError(`Login na Leaguepedia falhou: ${result?.reason ?? result?.result ?? "?"}`);
  }
}

function ensureSession() {
  session ??= login().catch((error) => {
    session = undefined; // permite tentar de novo na próxima chamada
    throw error;
  });
  return session;
}

/** GET na API com login, espera e nova tentativa quando a wiki limita as requisições. */
async function request(params: Record<string, string>): Promise<ApiResponse> {
  await ensureSession();

  for (let attempt = 0; ; attempt++) {
    const res = await wikiFetch(params);
    if (!res.ok && res.status !== 429) throw new LeaguepediaError(`Leaguepedia respondeu ${res.status}`);

    const body = (await res.json().catch(() => ({}))) as ApiResponse;
    const rateLimited = res.status === 429 || body.error?.code === "ratelimited";
    if (rateLimited && attempt < MAX_RETRIES) {
      // A sessão pode ter expirado (e aí voltamos a ser anônimos): entra de novo na 1ª falha.
      if (attempt === 0) {
        cookies.clear();
        session = undefined;
      }
      await sleep(15_000 * (attempt + 1));
      await ensureSession();
      continue;
    }
    if (rateLimited) throw new LeaguepediaError("A Leaguepedia está limitando as requisições. Tente de novo em alguns minutos.");
    if (body.error) throw new LeaguepediaError(`Leaguepedia: ${body.error.info}`);
    return body;
  }
}

/** Executa uma consulta Cargo e busca todas as páginas de resultado. */
export async function cargoQuery({ tables, fields, where, joinOn, orderBy }: CargoQuery) {
  const rows: Record<string, string | null>[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const body = await request({
      action: "cargoquery",
      tables,
      fields,
      ...(where && { where }),
      ...(joinOn && { join_on: joinOn }),
      ...(orderBy && { order_by: orderBy }),
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    const page = (body.cargoquery ?? []).map((row) => row.title);
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

/** Escapa um valor para usar entre aspas numa cláusula `where` da Cargo. */
export function cargoString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * URLs diretas (CDN static.wikia.nocookie.net) de arquivos da wiki, por nome de arquivo.
 * O atalho Special:FilePath responde 403 para imagens embutidas em outros sites.
 */
export async function fileUrls(files: string[]): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50);
    const body = await request({
      action: "query",
      prop: "imageinfo",
      iiprop: "url",
      titles: batch.map((f) => `File:${f}`).join("|"),
    });
    // A wiki normaliza os títulos ("_" → espaço, 1ª letra maiúscula); volta para o nome pedido.
    const original = new Map(batch.map((f) => [`File:${f}`, f]));
    for (const n of body.query?.normalized ?? []) original.set(n.to, original.get(n.from) ?? n.from);
    for (const page of Object.values(body.query?.pages ?? {})) {
      const url = page.imageinfo?.[0]?.url;
      const file = original.get(page.title);
      if (url && file) urls[file] = url;
    }
  }
  return urls;
}
