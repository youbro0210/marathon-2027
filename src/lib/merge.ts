import type { Race } from "@/data/types";

export function normName(name: string): string {
  return name
    .toLowerCase()
    .replace(/제\s*\d+\s*회/g, "")
    .replace(/20\d{2}/g, "")
    .replace(/\s+/g, "")
    .replace(/[()（）[\]._\-·]/g, "");
}

function samePage(a: string, b: string): boolean {
  try {
    const left = new URL(a);
    const right = new URL(b);
    const host = (value: string) => value.replace(/^www\./, "");
    const path = (value: string) => value.replace(/\/$/, "");
    return host(left.host) === host(right.host) && path(left.pathname) === path(right.pathname);
  } catch {
    return false;
  }
}

export function conflictsWithCurated(curated: Race, incoming: Race): boolean {
  const incomingName = normName(incoming.name);
  const curatedName = normName(curated.name);
  if (incomingName.length >= 4 && (incomingName.includes(curatedName) || curatedName.includes(incomingName))) {
    return true;
  }
  for (const key of curated.matchKeys ?? []) {
    if (incomingName.includes(normName(key))) return true;
  }
  return samePage(curated.url, incoming.url);
}

export function dedupeListings(races: Race[]): Race[] {
  const kept: Race[] = [];
  for (const race of races) {
    const name = normName(race.name);
    const index = kept.findIndex((item) => {
      const other = normName(item.name);
      return name === other || (name.length >= 6 && other.length >= 6 && (name.includes(other) || other.includes(name)));
    });
    if (index === -1) {
      kept.push(race);
      continue;
    }
    if (race.official && !kept[index]?.official) kept[index] = race;
  }
  return kept;
}

export function mergeRaces(curated: Race[], scraped: Race[]): Race[] {
  const fresh = dedupeListings(scraped).filter(
    (race) => !curated.some((item) => conflictsWithCurated(item, race)),
  );
  return [...curated, ...fresh];
}
