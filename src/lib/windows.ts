import type { Precision, Race, RegWindow, Status } from "@/data/types";
import { FOCUS_DISTANCES } from "@/data/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const DAY_MS = 86_400_000;
const SEOUL = 9 * 60 * 60 * 1000;

export type DistanceFilter = "관심" | "전체" | string;
export type StatusFilter = "전체" | Status;

export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function formatDistances(race: Pick<Race, "distances" | "extra">): string {
  const focus = new Set<string>(FOCUS_DISTANCES);
  const main = race.distances.filter((distance) => focus.has(distance));
  const rest = race.distances.filter((distance) => !focus.has(distance));
  const extra = [...rest, ...(race.extra ? [race.extra] : [])];
  if (main.length === 0) return race.distances.join(" · ");
  return extra.length > 0 ? `${main.join(" · ")} (${extra.join(" · ")})` : main.join(" · ");
}

export function windowsFor(race: Race): Record<string, RegWindow> {
  const windows: Record<string, RegWindow> = {};
  for (const distance of race.distances) {
    windows[distance] = race.windows?.[distance] ?? race.window ?? { openAt: null, closeAt: null };
  }
  return windows;
}

export function scopeDistances(race: Race, filter: DistanceFilter): string[] {
  if (filter === "전체") return race.distances;
  if (filter === "관심") {
    return race.distances.filter((distance) => (FOCUS_DISTANCES as readonly string[]).includes(distance));
  }
  return race.distances.filter((distance) => distance === filter);
}

export function distanceStatus(window: RegWindow, now: Date): Status {
  const time = now.getTime();
  if (window.openAt && time < Date.parse(window.openAt)) return "오픈 예정";
  if (window.closeAt && time >= Date.parse(window.closeAt)) return "마감";
  return "접수 중";
}

export function raceStatus(race: Race, now: Date, filter: DistanceFilter = "전체"): Status | null {
  const distances = scopeDistances(race, filter);
  if (distances.length === 0) return null;
  const windows = windowsFor(race);
  const statuses = distances.map((distance) => distanceStatus(windows[distance] ?? { openAt: null, closeAt: null }, now));
  if (statuses.includes("접수 중")) return "접수 중";
  if (statuses.includes("오픈 예정")) return "오픈 예정";
  return "마감";
}

export function opensWithin24h(race: Race, now: Date, filter: DistanceFilter = "전체"): boolean {
  const windows = windowsFor(race);
  const limit = now.getTime() + DAY_MS;
  return scopeDistances(race, filter).some((distance) => {
    const window = windows[distance];
    if (!window?.openAt) return false;
    const open = Date.parse(window.openAt);
    return distanceStatus(window, now) === "오픈 예정" && open <= limit;
  });
}

export function formatCountdown(target: string, now: Date): string {
  const diff = Math.max(0, Date.parse(target) - now.getTime());
  const total = Math.floor(diff / 1000);
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `D-${days} / ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function countdownLabel(race: Race, now: Date, filter: DistanceFilter = "전체"): string {
  const status = raceStatus(race, now, filter);
  const windows = windowsFor(race);
  const distances = scopeDistances(race, filter);
  if (status === "오픈 예정") {
    const opens = distances
      .map((distance) => windows[distance]?.openAt)
      .filter((value): value is string => Boolean(value) && Date.parse(value!) > now.getTime())
      .sort((a, b) => Date.parse(a) - Date.parse(b));
    return opens[0] ? `오픈까지 ${formatCountdown(opens[0], now)}` : "오픈 예정";
  }
  if (status === "접수 중") {
    const closes = distances
      .filter((distance) => distanceStatus(windows[distance] ?? { openAt: null, closeAt: null }, now) === "접수 중")
      .map((distance) => windows[distance]?.closeAt)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => Date.parse(a) - Date.parse(b));
    return closes[0] ? `마감까지 ${formatCountdown(closes[0], now)}` : "선착순 · 정원 마감 시 종료";
  }
  return "접수 마감";
}

export type SeoulParts = { year: number; month: number; day: number; hour: number; minute: number };

function seoulParts(iso: string): SeoulParts {
  const time = Date.parse(iso) + SEOUL;
  const date = new Date(time);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
}

export function isoDate(year: number, month: number, day: number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** 달력에 찍을 접수 시작/마감일. 마감이 자정(일 단위)이면 전날 23:59로 본다. */
export function windowBoundParts(iso: string, precision: Precision | undefined, edge: "open" | "close"): SeoulParts & { ymd: string } {
  const parts = seoulParts(iso);
  if (edge === "close" && precision !== "minute" && parts.hour === 0 && parts.minute === 0) {
    const previous = new Date(Date.parse(iso) - 1000 + SEOUL);
    const year = previous.getUTCFullYear();
    const month = previous.getUTCMonth() + 1;
    const day = previous.getUTCDate();
    return { year, month, day, hour: 23, minute: 59, ymd: isoDate(year, month, day) };
  }
  return { ...parts, ymd: isoDate(parts.year, parts.month, parts.day) };
}

function weekdayOf(year: number, month: number, day: number): string {
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? "";
}

function ymd(year: number, month: number, day: number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}(${weekdayOf(year, month, day)})`;
}

export function formatWindowBound(iso: string, precision: Precision | undefined, edge: "open" | "close"): string {
  const parts = seoulParts(iso);
  if (edge === "close" && precision !== "minute" && parts.hour === 0 && parts.minute === 0) {
    const previous = new Date(Date.parse(iso) - 1000 + SEOUL);
    return `${ymd(previous.getUTCFullYear(), previous.getUTCMonth() + 1, previous.getUTCDate())} 23:59`;
  }
  if (precision === "day" && parts.hour === 0 && parts.minute === 0) {
    return ymd(parts.year, parts.month, parts.day);
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${ymd(parts.year, parts.month, parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function formatWindow(window: RegWindow): string {
  const open = window.openAt
    ? formatWindowBound(window.openAt, window.openPrecision, "open")
    : "시작 시각 미상";
  if (!window.closeAt) return `${open} 오픈 · 마감일 없음`;
  const close = formatWindowBound(window.closeAt, window.closePrecision, "close");
  return `${open} ~ ${close}`;
}

export function registrationLabel(race: Race): string {
  const windows = windowsFor(race);
  const groups = new Map<string, string[]>();
  for (const distance of race.distances) {
    const label = formatWindow(windows[distance] ?? { openAt: null, closeAt: null });
    const list = groups.get(label) ?? [];
    list.push(distance);
    groups.set(label, list);
  }
  return [...groups.entries()].map(([label, distances]) => `${distances.join("·")} ${label}`).join(" / ");
}

function soonestOpen(race: Race, now: Date, filter: DistanceFilter): number {
  const windows = windowsFor(race);
  const times = scopeDistances(race, filter)
    .filter((distance) => distanceStatus(windows[distance] ?? { openAt: null, closeAt: null }, now) === "오픈 예정")
    .map((distance) => Date.parse(windows[distance]?.openAt ?? ""))
    .filter((time) => Number.isFinite(time));
  return times.length > 0 ? Math.min(...times) : Number.POSITIVE_INFINITY;
}

function soonestClose(race: Race, now: Date, filter: DistanceFilter): number {
  const windows = windowsFor(race);
  const times = scopeDistances(race, filter)
    .filter((distance) => distanceStatus(windows[distance] ?? { openAt: null, closeAt: null }, now) === "접수 중")
    .map((distance) => windows[distance]?.closeAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value));
  if (times.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...times);
}

export function matchesDistance(race: Race, filter: DistanceFilter): boolean {
  if (filter === "전체") return true;
  if (filter === "관심") return scopeDistances(race, "관심").length > 0;
  return race.distances.includes(filter);
}

export function visibleRaces(
  races: Race[],
  distance: DistanceFilter,
  status: StatusFilter,
  now: Date,
): Race[] {
  const filtered = races.filter((race) => {
    if (!matchesDistance(race, distance)) return false;
    if (status === "전체") return true;
    return raceStatus(race, now, distance) === status;
  });
  const rank: Record<Status, number> = { "오픈 예정": 0, "접수 중": 1, 마감: 2 };
  return filtered.sort((a, b) => {
    const statusA = raceStatus(a, now, distance) ?? "마감";
    const statusB = raceStatus(b, now, distance) ?? "마감";
    if (rank[statusA] !== rank[statusB]) return rank[statusA] - rank[statusB];
    if (statusA === "오픈 예정") return soonestOpen(a, now, distance) - soonestOpen(b, now, distance);
    if (statusA === "접수 중") return soonestClose(a, now, distance) - soonestClose(b, now, distance);
    return a.date.localeCompare(b.date);
  });
}

export function isNewAnnouncement(race: Race, now: Date): boolean {
  if (race.curated) return false;
  const seen = Date.parse(`${race.firstSeen}T00:00:00+09:00`);
  return now.getTime() - seen <= 7 * DAY_MS && seen <= now.getTime();
}

export function formatNow(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(now);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", weekday: "short" }).format(now);
  return `${pick("year")}-${pick("month")}-${pick("day")} (${weekday}) ${pick("hour")}:${pick("minute")}:${pick("second")} KST`;
}

export function seoulDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
