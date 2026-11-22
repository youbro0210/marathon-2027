import type { Race, RegWindow } from "@/data/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export type ParsedListing = {
  name: string;
  date: string;
  place: string;
  distances: string[];
  fees: string;
  window: RegWindow;
  url: string;
  listingUrl: string;
  sourceName: string;
  note?: string;
  official: boolean;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function weekdayOf(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)).getUTCDay()] ?? "";
}

export function normalizeDistance(raw: string): string | null {
  const text = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!text || text.includes("걷기") || text.includes("가족") || text.includes("단체")) return null;
  if (text.includes("하프") || text === "half") return "하프";
  if (text.includes("풀코스") || text === "풀" || text.startsWith("42")) return "풀";
  const km = text.match(/^(\d+(?:\.\d+)?)k(?:m)?$/);
  if (km) {
    const value = km[1];
    if (value === "10") return "10km";
    if (value === "5") return "5km";
    return `${value}km`;
  }
  if (text === "10k") return "10km";
  if (text === "5k") return "5km";
  return null;
}

export function normalizeDistances(raw: string): string[] {
  const found: string[] = [];
  for (const part of raw.split(/[·,/]/)) {
    const distance = normalizeDistance(part);
    if (distance && !found.includes(distance)) found.push(distance);
  }
  return found;
}

function at(date: string, time = "00:00:00"): string {
  return `${date}T${time}+09:00`;
}

function nextDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  utc.setUTCDate(utc.getUTCDate() + 1);
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`;
}

/** "2026-08-03 ~ 2026-11-15" 또는 "2026년7월31일~2026년11월22일", 마감 없음은 선착순. */
export function parseRegistrationRange(raw: string): RegWindow {
  const text = raw.replace(/\s+/g, " ").trim();
  const dates = [...text.matchAll(/(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})/g)].map((match) => {
    return `${match[1]}-${pad(Number(match[2]))}-${pad(Number(match[3]))}`;
  });
  const open = dates[0] ?? null;
  const hasClose = dates.length >= 2 && !/선착순\s*마감|마감일\s*없|별도\s*공지/.test(text);
  const close = hasClose ? dates[1] : null;
  return {
    openAt: open ? at(open) : null,
    closeAt: close ? at(nextDay(close)) : null,
    openPrecision: "day",
    closePrecision: close ? "day" : undefined,
  };
}

function field(description: string, label: string): string {
  const match = description.match(
    new RegExp(`${label}:\\s*(.*?)(?=\\s+(?:접수 상태|참가비|접수|일시|장소|종목|주최):|$)`),
  );
  return match?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function strip(html: string): string {
  return html
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseRunningonRss(xml: string, checkedOn: string): ParsedListing[] {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const races: ParsedListing[] = [];
  for (const block of blocks) {
    const title = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() ?? "";
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? "";
    const description = strip(block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "");
    if (!title || !description.includes("일시:") || !description.includes("종목:")) continue;
    const date = description.match(/일시:\s*(\d{4}-\d{2}-\d{2})/)?.[1];
    const distances = normalizeDistances(field(description, "종목"));
    if (!date || distances.length === 0) continue;
    const registration = field(description, "접수");
    races.push({
      name: title,
      date,
      place: field(description, "장소"),
      distances,
      fees: field(description, "참가비") || "공고 확인",
      window: parseRegistrationRange(registration),
      url: link,
      listingUrl: link,
      sourceName: "러닝온",
      note: field(description, "접수 상태") || undefined,
      official: false,
    });
  }
  return races.map((race) => race).filter((race) => race.date >= "2026-11-01" || race.window.closeAt === null || (race.window.closeAt ?? "") > `${checkedOn}T00:00:00+09:00`);
}

export function officialUrlFromRunningonHtml(html: string): string | null {
  const match = html.match(/\\"website\\":\\"(https?:[^"\\]+)\\"/) ?? html.match(/"website":"(https?:[^"]+)"/);
  if (!match?.[1]) return null;
  if (match[1].includes("runningon.co.kr")) return null;
  return match[1];
}

export function parseRunfinderHtml(html: string, pageUrl: string): ParsedListing | null {
  const text = strip(html);
  const name = html.match(/<title>([^<|]+)/)?.[1]?.replace(/\s*일정[\s\S]*$/, "").trim() ?? "";
  const date = text.match(/대회일시\s*(\d{4})[.\-/](\d{2})[.\-/](\d{2})/);
  const place = text.match(/장소\s+([^\n]+?)\s+종목/)?.[1]?.trim() ?? text.match(/장소\s+(\S.{0,40}?)\s+종목/)?.[1]?.trim() ?? "";
  const distances = normalizeDistances(text.match(/종목\s+([^접수]+?)\s+접수기간/)?.[1] ?? "");
  const registration = text.match(/접수기간\s+(\d{4}년\d{1,2}월\d{1,2}일~\d{4}년\d{1,2}월\d{1,2}일)/)?.[1] ?? "";
  const homepage = html.match(/공식 홈페이지[\s\S]{0,400}?href="(https?:\/\/[^"]+)"/)?.[1]
    ?? html.match(/href="(https?:\/\/(?!.*runfinder)[^"]+)"/)?.[1]
    ?? null;
  if (!name || !date || distances.length === 0) return null;
  const iso = `${date[1]}-${date[2]}-${date[3]}`;
  const official = Boolean(homepage && !homepage.includes("runfinder.kr") && !homepage.includes("jsdelivr"));
  return {
    name,
    date: iso,
    place: place.replace(/\s+/g, " "),
    distances,
    fees: "공고 확인",
    window: parseRegistrationRange(registration),
    url: official && homepage ? homepage : pageUrl,
    listingUrl: pageUrl,
    sourceName: "런파인더",
    official,
  };
}

export function toRace(listing: ParsedListing, firstSeen: string, lastChecked: string): Race {
  const slug = listing.listingUrl.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(-48);
  return {
    id: `feed-${slug}`,
    name: listing.name,
    date: listing.date,
    weekday: weekdayOf(listing.date),
    place: listing.place || "장소는 공고 확인",
    distances: listing.distances,
    window: listing.window,
    fees: listing.fees,
    note: listing.note,
    url: listing.url,
    listingUrl: listing.listingUrl,
    sourceName: listing.sourceName,
    curated: false,
    firstSeen,
    lastChecked,
    official: listing.official,
  };
}
