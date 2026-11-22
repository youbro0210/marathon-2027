import type { Precision, Race } from "@/data/types";
import {
  type DistanceFilter,
  isoDate,
  scopeDistances,
  seoulDate,
  windowBoundParts,
  windowsFor,
} from "@/lib/windows";

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export type CalendarKind = "open" | "close" | "race";

export type ScheduleEvent = {
  id: string;
  date: string;
  raceId: string;
  raceName: string;
  shortName: string;
  label: string;
  kind: CalendarKind;
  distances: string[];
};

const KIND_RANK: Record<CalendarKind, number> = { open: 0, close: 1, race: 2 };

export function shortRaceName(name: string): string {
  return name.replace(/^제?\s*\d+\s*회\s*/, "").replace(/^20\d{2}\s*/, "").trim() || name;
}

export function clockLabel(hour: number, minute: number): string {
  if (minute === 0) return `${hour}시`;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function boundTimeLabel(iso: string, precision: Precision | undefined, edge: "open" | "close"): string | null {
  const parts = windowBoundParts(iso, precision, edge);
  if (precision !== "minute" && parts.hour === 0 && parts.minute === 0) return null;
  return clockLabel(parts.hour, parts.minute);
}

function eventLabel(
  raceName: string,
  kind: CalendarKind,
  distances: string[],
  showDistances: boolean,
  time: string | null,
): string {
  if (kind === "race") return `${raceName} 대회일`;
  const word = kind === "open" ? "오픈" : "마감";
  const dist = showDistances && distances.length > 0 ? ` ${distances.join("·")}` : "";
  const timePart = time ? ` ${time}` : "";
  return `${raceName}${dist} ${word}${timePart}`;
}

function pushWindowEvents(events: ScheduleEvent[], race: Race, distances: string[], kind: "open" | "close") {
  const windows = windowsFor(race);
  const buckets = new Map<string, { date: string; distances: string[]; time: string | null }>();
  for (const distance of distances) {
    const window = windows[distance] ?? { openAt: null, closeAt: null };
    const iso = kind === "open" ? window.openAt : window.closeAt;
    if (!iso || !Number.isFinite(Date.parse(iso))) continue;
    const precision = kind === "open" ? window.openPrecision : window.closePrecision;
    const parts = windowBoundParts(iso, precision, kind);
    const time = boundTimeLabel(iso, precision, kind);
    const key = `${parts.ymd}|${time ?? ""}`;
    const bucket = buckets.get(key) ?? { date: parts.ymd, distances: [], time };
    bucket.distances.push(distance);
    buckets.set(key, bucket);
  }
  for (const bucket of buckets.values()) {
    const showDistances = bucket.distances.length !== distances.length;
    events.push({
      id: `${race.id}-${kind}-${bucket.date}-${bucket.distances.join("-")}`,
      date: bucket.date,
      raceId: race.id,
      raceName: race.name,
      shortName: shortRaceName(race.name),
      label: eventLabel(race.name, kind, bucket.distances, showDistances, bucket.time),
      kind,
      distances: bucket.distances,
    });
  }
}

export function scheduleEvents(races: Race[], filter: DistanceFilter = "관심"): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];
  for (const race of races) {
    const distances = scopeDistances(race, filter);
    if (distances.length === 0) continue;
    pushWindowEvents(events, race, distances, "open");
    pushWindowEvents(events, race, distances, "close");
    if (/^\d{4}-\d{2}-\d{2}$/.test(race.date)) {
      events.push({
        id: `${race.id}-race-${race.date}`,
        date: race.date,
        raceId: race.id,
        raceName: race.name,
        shortName: shortRaceName(race.name),
        label: `${race.name} 대회일`,
        kind: "race",
        distances,
      });
    }
  }
  return events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (KIND_RANK[a.kind] !== KIND_RANK[b.kind]) return KIND_RANK[a.kind] - KIND_RANK[b.kind];
    return a.label.localeCompare(b.label, "ko");
  });
}

export function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

export function fromMonthIndex(index: number): { year: number; month: number } {
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function seoulTodayParts(now: Date): { year: number; month: number; day: number; ymd: string } {
  const ymd = seoulDate(now);
  const [year, month, day] = ymd.split("-").map(Number);
  return { year: year ?? 0, month: month ?? 0, day: day ?? 0, ymd };
}

export function eventMonthRange(events: ScheduleEvent[], today: Date): { min: number; max: number } {
  const todayParts = seoulTodayParts(today);
  let min = monthIndex(todayParts.year, todayParts.month);
  let max = min;
  for (const event of events) {
    const year = Number(event.date.slice(0, 4));
    const month = Number(event.date.slice(5, 7));
    if (!year || !month) continue;
    const index = monthIndex(year, month);
    min = Math.min(min, index);
    max = Math.max(max, index);
  }
  return { min, max };
}

export function weeksOf(year: number, month: number): Array<Array<number | null>> {
  const monthIndex0 = month - 1;
  const start = new Date(Date.UTC(year, monthIndex0, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: start }, () => null),
    ...Array.from({ length: days }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Array<Array<number | null>> = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

export function eventsOnDate(events: ScheduleEvent[], date: string): ScheduleEvent[] {
  return events.filter((event) => event.date === date);
}

export function eventsInMonth(events: ScheduleEvent[], year: number, month: number): ScheduleEvent[] {
  const prefix = `${isoDate(year, month, 1).slice(0, 7)}-`;
  return events.filter((event) => event.date.startsWith(prefix));
}

export type CellRace = {
  raceId: string;
  shortName: string;
  kinds: CalendarKind[];
};

export function uniqueRacesOnDay(events: ScheduleEvent[]): CellRace[] {
  const items: CellRace[] = [];
  for (const event of events) {
    const existing = items.find((item) => item.raceId === event.raceId);
    if (existing) {
      if (!existing.kinds.includes(event.kind)) existing.kinds.push(event.kind);
    } else {
      items.push({ raceId: event.raceId, shortName: event.shortName, kinds: [event.kind] });
    }
  }
  return items;
}
