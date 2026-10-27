import { parseSeries, type CargoRow, type Game, type GamePlayer, type Series } from "@/lib/esports/parse";

// Linhas no formato devolvido pela Cargo (campos com espaço), copiadas da Leaguepedia.

export const scheduleRow: CargoRow = {
  MatchId: "2026 Season World Championship/Main Event_Round 1_1",
  OverviewPage: "2026 Season World Championship/Main Event",
  Tab: "Round 1",
  "N MatchInTab": "1",
  "DateTime UTC": "2026-10-23 17:00:00",
  BestOf: "1",
  Team1: "Gen.G",
  Team2: "Invictus Gaming",
  Team1Score: "1",
  Team2Score: "0",
  Winner: "1",
};

export const gameRow: CargoRow = {
  GameId: "2026 Season World Championship/Main Event_Round 1_1_1",
  MatchId: "2026 Season World Championship/Main Event_Round 1_1",
  "N GameInMatch": "1",
  "DateTime UTC": "2026-10-23 17:21:00",
  Gamelength: "26:01",
  Patch: "26.20",
  Winner: "2",
  Team1: "Invictus Gaming",
  Team2: "Gen.G",
  Team1Picks: "Rumble,Jarvan IV,Aurora,Jhin,Alistar",
  Team2Picks: "Ornn,Qiyana,Akali,Corki,Nautilus",
  Team1Bans: "Vi,Lee Sin,Cassiopeia,Renata Glasc,Lucian",
  Team2Bans: "Nocturne,Syndra,Galio,Lulu,Ezreal",
  Team1Kills: "10",
  Team2Kills: "22",
  Team1Gold: "45802",
  Team2Gold: "59243",
  Team1Towers: "2",
  Team2Towers: "9",
  Team1Dragons: "0",
  Team2Dragons: "4",
  Team1Barons: "0",
  Team2Barons: "1",
  Team1RiftHeralds: "1",
  Team2RiftHeralds: "0",
  Team1VoidGrubs: "2",
  Team2VoidGrubs: "1",
};

export const playerRow = (overrides: CargoRow = {}): CargoRow => ({
  GameId: "2026 Season World Championship/Main Event_Round 1_1_1",
  Name: "Canyon",
  Link: "Canyon",
  Team: "Gen.G",
  Side: "2",
  Role: "Jungle",
  "Role Number": "2",
  Champion: "Qiyana",
  PlayerWin: "Yes",
  Kills: "8",
  Deaths: "1",
  Assists: "10",
  CS: "248",
  Gold: "14925",
  DamageToChampions: "19278",
  VisionScore: "44",
  Items: ";Edge of Night;Last Whisper;Bastionbreaker;Voltaic Cyclosword;Mercury's Treads",
  Trinket: "Oracle Lens",
  KeystoneRune: "First Strike",
  SecondaryTree: "Domination",
  Runes: "First Strike,Cash Back,Triple Tonic,Cosmic Insight,Sudden Impact,Ultimate Hunter,Adaptive Force,Adaptive Force,Health",
  SummonerSpells: "Smite,Flash",
  ...overrides,
});

let seq = 0;

/** Série da fase suíça já encerrada (ou futura, sem `winner`). */
export function series(team1: string, team2: string, winner: 1 | 2 | null, tab = "Round 1"): Series {
  seq++;
  return parseSeries({
    ...scheduleRow,
    MatchId: `2026 Season World Championship/Main Event_${tab}_${seq}`,
    Tab: tab,
    "N MatchInTab": String(seq),
    "DateTime UTC": `2026-10-23 ${String(seq % 24).padStart(2, "0")}:00:00`,
    Team1: team1,
    Team2: team2,
    Team1Score: winner ? String(Number(winner === 1)) : "",
    Team2Score: winner ? String(Number(winner === 2)) : "",
    Winner: winner ? String(winner) : "",
  });
}

const player = (champion: string, side: 1 | 2, win: boolean, k = 1, d = 1, a = 1): GamePlayer => ({
  name: champion,
  team: side === 1 ? "Azul" : "Vermelho",
  side,
  role: "Mid",
  champion,
  win,
  kills: k,
  deaths: d,
  assists: a,
  cs: 0,
  gold: 0,
  damage: 0,
  vision: 0,
  items: [null, null, null, null, null, null],
  trinket: null,
  keystone: null,
  secondaryTree: null,
  runes: [],
  spells: [],
});

/** Jogo mínimo: um campeão por lado. */
export function game(blue: string, red: string, winner: 1 | 2, bans: string[] = [], durationSec = 1800): Game {
  const team = (name: string, side: 1 | 2) => ({
    name,
    picks: [side === 1 ? blue : red],
    bans: side === 1 ? bans : [],
    kills: 0,
    gold: 0,
    towers: 0,
    dragons: 0,
    barons: 0,
    heralds: 0,
    grubs: 0,
  });
  return {
    id: `${blue}-${red}`,
    seriesId: "x",
    number: 1,
    startsAt: 0,
    durationSec,
    patch: "26.20",
    winner,
    blue: team("Azul", 1),
    red: team("Vermelho", 2),
    players: [player(blue, 1, winner === 1, 4, 1, 2), player(red, 2, winner === 2, 1, 2, 0)],
  };
}
