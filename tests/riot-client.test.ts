import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  createRiotClient,
  parseRateLimits,
  RiotAuthError,
  RiotNotFoundError,
  type RiotClient,
} from "@/lib/riot/client";
import { createRiotApi } from "@/lib/riot/endpoints";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const clients: RiotClient[] = [];
afterEach(async () => {
  await Promise.all(clients.splice(0).map((c) => c.close()));
});

function makeClient(sleep = vi.fn(async () => {})) {
  const client = createRiotClient({
    apiKey: "RGAPI-test",
    rateLimits: [{ limit: 100, windowSec: 1 }],
    sleep,
  });
  clients.push(client);
  return { api: createRiotApi(client), sleep };
}

const ACCOUNT_URL =
  "https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/:name/:tag";

describe("roteamento", () => {
  it("usa o host regional para account e match, e a plataforma para summoner", async () => {
    const hosts: string[] = [];
    server.use(
      http.get("https://*.api.riotgames.com/*", ({ request }) => {
        hosts.push(new URL(request.url).hostname);
        return HttpResponse.json({});
      }),
    );
    const { api } = makeClient();

    await api.getAccountByRiotId("br1", { gameName: "a b c", tagLine: "BR1" });
    await api.getSummonerByPuuid("br1", "p");
    await api.getMatchIds("euw1", "p", { count: 20, queue: 420 });
    await api.getMatch("vn2", "VN2_1");

    expect(hosts).toEqual([
      "americas.api.riotgames.com",
      "br1.api.riotgames.com",
      "europe.api.riotgames.com",
      "sea.api.riotgames.com",
    ]);
  });

  it("envia a chave no header e codifica o Riot ID", async () => {
    server.use(
      http.get(ACCOUNT_URL, ({ request, params }) => {
        expect(request.headers.get("X-Riot-Token")).toBe("RGAPI-test");
        expect(params.name).toBe("Pão de Queijo");
        return HttpResponse.json({ puuid: "abc", gameName: "Pão de Queijo", tagLine: "BR1" });
      }),
    );
    const { api } = makeClient();

    const account = await api.getAccountByRiotId("br1", {
      gameName: "Pão de Queijo",
      tagLine: "BR1",
    });
    expect(account.puuid).toBe("abc");
  });
});

describe("erros e retry", () => {
  it("espera o Retry-After e tenta de novo após 429", async () => {
    let calls = 0;
    server.use(
      http.get(ACCOUNT_URL, () => {
        calls++;
        if (calls === 1) {
          return new HttpResponse(null, { status: 429, headers: { "Retry-After": "3" } });
        }
        return HttpResponse.json({ puuid: "abc" });
      }),
    );
    const { api, sleep } = makeClient();

    await expect(
      api.getAccountByRiotId("br1", { gameName: "abc", tagLine: "BR1" }),
    ).resolves.toEqual({ puuid: "abc" });
    expect(calls).toBe(2);
    expect(sleep).toHaveBeenCalledWith(3000);
  });

  it("tenta de novo em 5xx e desiste depois de maxRetries", async () => {
    let calls = 0;
    server.use(
      http.get(ACCOUNT_URL, () => {
        calls++;
        return new HttpResponse(null, { status: 503 });
      }),
    );
    const { api } = makeClient();

    await expect(
      api.getAccountByRiotId("br1", { gameName: "abc", tagLine: "BR1" }),
    ).rejects.toMatchObject({ status: 503 });
    expect(calls).toBe(4);
  });

  it("transforma 404 em RiotNotFoundError sem retry", async () => {
    let calls = 0;
    server.use(
      http.get(ACCOUNT_URL, () => {
        calls++;
        return new HttpResponse(null, { status: 404 });
      }),
    );
    const { api } = makeClient();

    await expect(
      api.getAccountByRiotId("br1", { gameName: "abc", tagLine: "BR1" }),
    ).rejects.toBeInstanceOf(RiotNotFoundError);
    expect(calls).toBe(1);
  });

  it("transforma 401/403 em RiotAuthError", async () => {
    server.use(http.get(ACCOUNT_URL, () => new HttpResponse(null, { status: 403 })));
    const { api } = makeClient();

    await expect(
      api.getAccountByRiotId("br1", { gameName: "abc", tagLine: "BR1" }),
    ).rejects.toBeInstanceOf(RiotAuthError);
  });
});

describe("rate limit", () => {
  it("lê o formato limite:janela", () => {
    expect(parseRateLimits("20:1,100:120")).toEqual([
      { limit: 20, windowSec: 1 },
      { limit: 100, windowSec: 120 },
    ]);
    expect(() => parseRateLimits("20")).toThrow();
  });

  it("segura as requisições que passam do limite da janela", async () => {
    server.use(http.get("https://br1.api.riotgames.com/*", () => HttpResponse.json({})));
    const client = createRiotClient({
      apiKey: "RGAPI-test",
      rateLimits: [{ limit: 2, windowSec: 1 }],
    });
    clients.push(client);

    const started = Date.now();
    await Promise.all([1, 2, 3].map(() => client.get("br1", "/x")));
    // As duas primeiras saem na hora; a terceira espera a janela de 1s recarregar.
    expect(Date.now() - started).toBeGreaterThanOrEqual(900);
  });
});
