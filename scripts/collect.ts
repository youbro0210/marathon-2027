import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  officialUrlFromRunningonHtml,
  parseRunfinderHtml,
  parseRunningonRss,
  toRace,
  type ParsedListing,
} from "../src/lib/parseFeed.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "MarathonScheduleBot/1.0 (personal race calendar; 1 request / 1.5s; respects robots.txt)";
const GAP_MS = 1500;

const SOURCES = {
  runningonRss: "https://runningon.co.kr/rss.xml",
  runfinderHome: "https://runfinder.kr/",
} as const;

type SourceReport = { name: string; url: string; ok: boolean; races: number; note?: string };
type Skip = { name: string; reason: string };

const skipped: Skip[] = [
  {
    name: "런닝인사이드 (runin.kr)",
    reason: "페이지에 자동 수집·복제를 하지 말라는 고지와 TDM 예약이 있어 수집하지 않음",
  },
  {
    name: "러너블 (runable.me)",
    reason: "robots.txt가 /ko/ 를 금지. 한국어 대회 목록은 그 경로라 수집하지 않음",
  },
  {
    name: "투게더런 (toge.run)",
    reason: "대회 상세가 2,600건을 넘어 대량 수집하지 않음. /api/ 는 robots.txt 금지",
  },
  {
    name: "마라톤협회 (mara1080.com)",
    reason: "첫 화면이 앱 홍보용이고 공개 대회 목록 HTML이 없어 수집하지 않음",
  },
  {
    name: "marathon.pe.kr",
    reason: "TLS 인증서 이름이 맞지 않아 접속하지 않음",
  },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

let lastFetch = 0;

async function fetchText(url: string): Promise<string> {
  const wait = GAP_MS - (Date.now() - lastFetch);
  if (wait > 0) await sleep(wait);
  lastFetch = Date.now();
  const response = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,application/rss+xml,text/plain" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

function starGroupDisallows(robots: string, path: string): boolean {
  const lines = robots.split(/\r?\n/);
  let inStar = false;
  const rules: Array<{ allow: boolean; path: string }> = [];
  for (const raw of lines) {
    const line = raw.split("#")[0]?.trim() ?? "";
    if (!line) continue;
    const agent = line.match(/^user-agent:\s*(.+)$/i);
    if (agent) {
      inStar = agent[1]?.trim() === "*";
      continue;
    }
    if (!inStar) continue;
    const rule = line.match(/^(allow|disallow):\s*(.*)$/i);
    if (!rule) continue;
    rules.push({ allow: rule[1]?.toLowerCase() === "allow", path: rule[2] ?? "" });
  }
  let matched: { allow: boolean; path: string } | null = null;
  for (const rule of rules) {
    if (!rule.path) continue;
    if (path.startsWith(rule.path) && (!matched || rule.path.length > matched.path.length)) matched = rule;
  }
  return matched ? !matched.allow : false;
}

function seoulToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function daysBefore(day: string, count: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1));
  utc.setUTCDate(utc.getUTCDate() - count);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`;
}

function firstSeenFor(id: string, openAt: string | null, seen: Record<string, string>, today: string, bootstrapped: boolean): string {
  const existing = seen[id];
  if (existing) return existing;
  const openDay = openAt?.slice(0, 10) ?? null;
  if (!bootstrapped) {
    if (openDay && openDay <= today) return openDay;
    return "2026-11-01";
  }
  return today;
}

async function collectRunningon(today: string): Promise<{ listings: ParsedListing[]; report: SourceReport }> {
  const robots = await fetchText("https://runningon.co.kr/robots.txt");
  if (starGroupDisallows(robots, "/rss.xml")) {
    return { listings: [], report: { name: "러닝온", url: SOURCES.runningonRss, ok: false, races: 0, note: "robots.txt가 RSS를 금지" } };
  }
  const xml = await fetchText(SOURCES.runningonRss);
  const listings = parseRunningonRss(xml, today);
  let officialCount = 0;
  for (const listing of listings) {
    const path = new URL(listing.listingUrl).pathname;
    if (starGroupDisallows(robots, path)) continue;
    try {
      const html = await fetchText(listing.listingUrl);
      const official = officialUrlFromRunningonHtml(html);
      if (official) {
        listing.url = official;
        listing.official = true;
        officialCount += 1;
      }
    } catch (error) {
      listing.note = `${listing.note ?? ""} 상세 페이지 실패`.trim();
      console.warn("runningon detail", listing.listingUrl, error);
    }
  }
  return {
    listings,
    report: {
      name: "러닝온",
      url: SOURCES.runningonRss,
      ok: true,
      races: listings.length,
      note: `RSS ${listings.length}건, 공식 링크 ${officialCount}건`,
    },
  };
}

async function collectRunfinder(): Promise<{ listings: ParsedListing[]; report: SourceReport }> {
  const robots = await fetchText("https://runfinder.kr/robots.txt");
  if (starGroupDisallows(robots, "/")) {
    return { listings: [], report: { name: "런파인더", url: SOURCES.runfinderHome, ok: false, races: 0, note: "robots.txt 금지" } };
  }
  const home = await fetchText(SOURCES.runfinderHome);
  const paths = [...new Set([...home.matchAll(/href="(\/race_view\.php\?id=\d+)"/g)].map((match) => match[1]))].slice(0, 12);
  const listings: ParsedListing[] = [];
  for (const path of paths) {
    if (!path || starGroupDisallows(robots, path)) continue;
    const url = new URL(path, SOURCES.runfinderHome).toString();
    try {
      const html = await fetchText(url);
      const parsed = parseRunfinderHtml(html, url);
      if (parsed) listings.push(parsed);
    } catch (error) {
      console.warn("runfinder", url, error);
    }
  }
  return {
    listings,
    report: { name: "런파인더", url: SOURCES.runfinderHome, ok: true, races: listings.length, note: `접수중 목록에서 상세 ${paths.length}건` },
  };
}

async function main(): Promise<void> {
  const today = seoulToday();
  const seenPath = resolve(ROOT, "src/data/seen.json");
  const seen = JSON.parse(await readFile(seenPath, "utf8")) as Record<string, string>;
  const bootstrapped = Object.keys(seen).length > 0;
  const reports: SourceReport[] = [];
  const listings: ParsedListing[] = [];

  try {
    const runningon = await collectRunningon(today);
    listings.push(...runningon.listings);
    reports.push(runningon.report);
  } catch (error) {
    reports.push({ name: "러닝온", url: SOURCES.runningonRss, ok: false, races: 0, note: String(error) });
  }

  try {
    const runfinder = await collectRunfinder();
    listings.push(...runfinder.listings);
    reports.push(runfinder.report);
  } catch (error) {
    reports.push({ name: "런파인더", url: SOURCES.runfinderHome, ok: false, races: 0, note: String(error) });
  }

  const races = listings.map((listing) => {
    const draft = toRace(listing, today, today);
    const firstSeen = firstSeenFor(draft.id, listing.window.openAt, seen, today, bootstrapped);
    seen[draft.id] = firstSeen;
    return { ...draft, firstSeen, lastChecked: today };
  });

  const payload = {
    collectedAt: new Date().toISOString(),
    sources: reports,
    skipped,
    races,
  };
  await writeFile(resolve(ROOT, "src/data/scraped.json"), `${JSON.stringify(payload, null, 2)}\n`);
  await writeFile(seenPath, `${JSON.stringify(seen, null, 2)}\n`);
  console.log(JSON.stringify({ today, reports, races: races.length, newish: races.filter((race) => race.firstSeen >= daysBefore(today, 7)).length }, null, 2));
}

await main();
