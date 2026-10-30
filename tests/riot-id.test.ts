import { describe, expect, it } from "vitest";
import { parseRiotId, parseRiotIdSlug, toRiotIdSlug } from "@/lib/riot/riot-id";
import { PLATFORMS, platformFromSlug, slugFromPlatform } from "@/lib/riot/routing";

describe("parseRiotId", () => {
  it("separa nome e tag", () => {
    expect(parseRiotId("Faker#KR1")).toEqual({ gameName: "Faker", tagLine: "KR1" });
  });

  it("aceita espaços no nome e remove espaços nas pontas", () => {
    expect(parseRiotId("  Hide on bush #KR1 ")).toEqual({
      gameName: "Hide on bush",
      tagLine: "KR1",
    });
  });

  it("rejeita entradas sem tag ou com tag inválida", () => {
    expect(parseRiotId("Faker")).toBeNull();
    expect(parseRiotId("Faker#")).toBeNull();
    expect(parseRiotId("Faker#AB")).toBeNull();
    expect(parseRiotId("Faker#ABCDEF")).toBeNull();
    expect(parseRiotId("ab#BR1")).toBeNull();
  });
});

describe("slug da URL", () => {
  it("faz ida e volta com espaços e acentos", () => {
    const id = { gameName: "Pão de Queijo", tagLine: "BR1" };
    expect(parseRiotIdSlug(toRiotIdSlug(id))).toEqual(id);
  });

  it("separa no último hífen", () => {
    expect(parseRiotIdSlug("Nome-Com-Hifen-BR1")).toEqual({
      gameName: "Nome-Com-Hifen",
      tagLine: "BR1",
    });
  });
});

describe("slugFromPlatform", () => {
  it("é o inverso de platformFromSlug para todas as plataformas", () => {
    for (const platform of PLATFORMS) expect(platformFromSlug(slugFromPlatform(platform))).toBe(platform);
    expect(slugFromPlatform("br1")).toBe("br");
  });
});
