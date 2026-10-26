import { describe, expect, it } from "vitest";
import { parseSearchInput } from "@/lib/services/player-search";

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
