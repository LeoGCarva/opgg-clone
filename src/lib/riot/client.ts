import Bottleneck from "bottleneck";
import { env } from "@/env";
import { hostUrl, type RoutingHost } from "./routing";

export class RiotApiError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    message = `Riot API respondeu ${status} em ${url}`,
  ) {
    super(message);
    this.name = "RiotApiError";
  }
}

export class RiotNotFoundError extends RiotApiError {
  name = "RiotNotFoundError";
}

/** 401/403: chave ausente, inválida ou expirada (a dev key dura 24h). */
export class RiotAuthError extends RiotApiError {
  name = "RiotAuthError";
}

export type RateLimit = { limit: number; windowSec: number };

export function parseRateLimits(spec: string): RateLimit[] {
  return spec.split(",").map((part) => {
    const [limit, windowSec] = part.split(":").map(Number);
    if (!limit || !windowSec) throw new Error(`RIOT_RATE_LIMITS inválido: "${part}"`);
    return { limit, windowSec };
  });
}

type Query = Record<string, string | number | undefined>;

export type RiotClientOptions = {
  apiKey: string;
  rateLimits: RateLimit[];
  maxRetries?: number;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

export type RiotClient = {
  get<T>(host: RoutingHost, path: string, query?: Query): Promise<T>;
  close(): Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createRiotClient({
  apiKey,
  rateLimits,
  maxRetries = 3,
  fetch: fetchImpl = fetch,
  sleep = defaultSleep,
}: RiotClientOptions): RiotClient {
  // O limite da aplicação é contado por host (cada plataforma/região tem o seu).
  const limiters = new Map<RoutingHost, Bottleneck[]>();

  function limiterFor(host: RoutingHost): Bottleneck {
    let chain = limiters.get(host);
    if (!chain) {
      chain = rateLimits.map(
        ({ limit, windowSec }) =>
          new Bottleneck({
            reservoir: limit,
            reservoirRefreshAmount: limit,
            reservoirRefreshInterval: windowSec * 1000,
          }),
      );
      // Um job só roda quando há "ficha" em todas as janelas.
      for (let i = 0; i < chain.length - 1; i++) chain[i].chain(chain[i + 1]);
      limiters.set(host, chain);
    }
    return chain[0];
  }

  function buildUrl(host: RoutingHost, path: string, query?: Query): string {
    const url = new URL(path, hostUrl(host));
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  async function get<T>(host: RoutingHost, path: string, query?: Query): Promise<T> {
    const url = buildUrl(host, path, query);
    const limiter = limiterFor(host);

    for (let attempt = 0; ; attempt++) {
      const res = await limiter.schedule(() =>
        fetchImpl(url, { headers: { "X-Riot-Token": apiKey } }),
      );

      if (res.ok) return (await res.json()) as T;

      const canRetry = attempt < maxRetries;
      if (res.status === 429 && canRetry) {
        const retryAfter = Number(res.headers.get("Retry-After"));
        await sleep((retryAfter > 0 ? retryAfter : attempt + 1) * 1000);
        continue;
      }
      if (res.status >= 500 && canRetry) {
        await sleep(500 * 2 ** attempt);
        continue;
      }

      if (res.status === 404) throw new RiotNotFoundError(404, url);
      if (res.status === 401 || res.status === 403) throw new RiotAuthError(res.status, url);
      throw new RiotApiError(res.status, url);
    }
  }

  async function close() {
    await Promise.all(
      [...limiters.values()].flat().map((l) => l.disconnect(false)),
    );
    limiters.clear();
  }

  return { get, close };
}

// Singleton por processo; guardado no globalThis para sobreviver ao HMR do `next dev`,
// senão cada reload criaria limiters novos e o rate limit deixaria de valer.
const globalForRiot = globalThis as unknown as { riotClient?: RiotClient };

export function getRiotClient(): RiotClient {
  if (!globalForRiot.riotClient) {
    const { RIOT_API_KEY, RIOT_RATE_LIMITS } = env();
    globalForRiot.riotClient = createRiotClient({
      apiKey: RIOT_API_KEY,
      rateLimits: parseRateLimits(RIOT_RATE_LIMITS),
    });
  }
  return globalForRiot.riotClient;
}
