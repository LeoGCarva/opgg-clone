// Datas do torneio no horário de Brasília.
const TIME_ZONE = "America/Sao_Paulo";

const dayFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const shortFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** "Quinta-feira, 15 de outubro" (só a primeira letra maiúscula). */
export function formatDay(ms: number): string {
  const day = dayFormat.format(ms);
  return day.charAt(0).toUpperCase() + day.slice(1);
}
export const formatTime = (ms: number) => timeFormat.format(ms);
export const formatShortDate = (ms: number) => shortFormat.format(ms);

export const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export const formatGold = (gold: number) => `${(gold / 1000).toFixed(1)}k`;
