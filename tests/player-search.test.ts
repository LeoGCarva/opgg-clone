import { describe, expect, it } from "vitest";
import { exactNameInput, parseSearchInput } from "@/lib/services/player-search";

describe("parseSearchInput", () => {
  it("busca por prefixo do nome, sem diferenciar maiúsculas", () => {
    expect(parseSearchInput("  YuK ")).toEqual({ name: "yuk", namePattern: "yuk%" });
  });

  it("com #, usa o nome exato e o prefixo da tag", () => {
    expect(parseSearchInput("Yukarina#3")).toEqual({
      name: "yukarina",
      namePattern: "yukarina",
      tagPattern: "3%",
    });
    expect(parseSearchInput("Yukarina#")).toMatchObject({ tagPattern: "%" });
  });

  it("aceita espaços e acentos no nome", () => {
    expect(parseSearchInput("Pão de")).toEqual({ name: "pão de", namePattern: "pão de%" });
  });

  it("escapa os curingas do LIKE", () => {
    expect(parseSearchInput("100%_x\\")).toEqual({ name: "100%_x\\", namePattern: "100\\%\\_x\\\\%" });
  });

  it("devolve null para nomes curtos demais", () => {
    expect(parseSearchInput("a")).toBeNull();
    expect(parseSearchInput(" ")).toBeNull();
    expect(parseSearchInput("a#BR1")).toBeNull();
  });
});

describe("exactNameInput", () => {
  it("nome exato em minúsculas, sem curinga", () => {
    expect(exactNameInput("  Faker ")).toEqual({ name: "faker", namePattern: "faker" });
  });

  it("escapa % e _ para não virarem curinga", () => {
    expect(exactNameInput("a_b%c")).toEqual({ name: "a_b%c", namePattern: String.raw`a\_b\%c` });
  });

  it("aceita espaços e acentos", () => {
    expect(exactNameInput("Pão de Queijo")).toEqual({ name: "pão de queijo", namePattern: "pão de queijo" });
  });

  it("respeita os limites do Riot ID (3 a 16 caracteres)", () => {
    expect(exactNameInput("ab")).toBeNull();
    expect(exactNameInput("abc")).not.toBeNull();
    expect(exactNameInput("a".repeat(16))).not.toBeNull();
    expect(exactNameInput("a".repeat(17))).toBeNull();
  });
});
