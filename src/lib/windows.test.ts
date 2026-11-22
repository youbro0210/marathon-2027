import { describe, expect, it } from "vitest";
import { curatedRaces, plannedHalf } from "@/data/curated";
import { mergeRaces } from "@/lib/merge";
import { parseRegistrationRange, parseRunningonRss } from "@/lib/parseFeed";
import {
  countdownLabel,
  formatCountdown,
  opensWithin24h,
  raceStatus,
  visibleRaces,
} from "@/lib/windows";
import type { Race } from "@/data/types";

const NOW = new Date("2026-11-22T15:30:00+09:00");

describe("live status", () => {
  it("sorts upcoming by open time, open races by close time, and puts no-close races last", () => {
    expect(visibleRaces(curatedRaces, "전체", "전체", NOW).map((race) => race.id)).toEqual([
      "huimang",
      "daegu",
      "hapcheon",
      "jeonbuk",
      "dadaepo",
      "samil",
      "jeonma",
      "bucheon",
      "polar",
      "jeongeup",
      "goguryeo",
      "suwon",
    ]);
  });

  it("marks 희망드림 as opening within 24 hours and 수원 as first-come", () => {
    const huimang = curatedRaces.find((race) => race.id === "huimang");
    const suwon = curatedRaces.find((race) => race.id === "suwon");
    expect(huimang && raceStatus(huimang, NOW)).toBe("오픈 예정");
    expect(huimang && opensWithin24h(huimang, NOW)).toBe(true);
    expect(suwon && countdownLabel(suwon, NOW)).toBe("선착순 · 정원 마감 시 종료");
  });

  it("uses the half window and the 10km window separately for 합천", () => {
    const hapcheon = curatedRaces.find((race) => race.id === "hapcheon");
    expect(hapcheon).toBeDefined();
    const duringHalf = new Date("2026-12-01T11:00:00+09:00");
    expect(raceStatus(hapcheon!, duringHalf, "하프")).toBe("접수 중");
    expect(raceStatus(hapcheon!, duringHalf, "10km")).toBe("오픈 예정");
    expect(raceStatus(hapcheon!, duringHalf, "전체")).toBe("접수 중");
  });

  it("closes 대구 at the end of 2026-12-01", () => {
    const daegu = curatedRaces.find((race) => race.id === "daegu");
    expect(raceStatus(daegu!, new Date("2026-12-01T23:30:00+09:00"))).toBe("접수 중");
    expect(raceStatus(daegu!, new Date("2026-12-02T00:00:00+09:00"))).toBe("마감");
  });

  it("formats a countdown as D-n / hh:mm:ss", () => {
    expect(formatCountdown("2026-11-25T17:44:05+09:00", NOW)).toBe("D-3 / 02:14:05");
  });
});

describe("merge and parse", () => {
  it("keeps the curated race when a feed uses the same name", () => {
    const copy = {
      ...curatedRaces[0],
      id: "feed-huimang",
      curated: false,
      sourceName: "러닝온",
    } satisfies Race;
    const extra: Race = {
      ...copy,
      id: "feed-new",
      name: "평화의숲 마라톤",
      matchKeys: [],
      url: "https://example.com/peace",
    };
    const merged = mergeRaces(curatedRaces, [copy!, extra]);
    expect(merged.filter((race) => race.name.includes("희망드림"))).toHaveLength(1);
    expect(merged.some((race) => race.id === "feed-new")).toBe(true);
  });

  it("does not treat every race on a shared registration host as the same event", () => {
    const other: Race = {
      ...curatedRaces.find((race) => race.id === "samil")!,
      id: "feed-other",
      name: "전국마라톤협회 2026 골드런 레이스",
      curated: false,
      url: "https://mara1080.com/event/someone-else",
      matchKeys: [],
    };
    expect(mergeRaces(curatedRaces, [other]).some((race) => race.id === "feed-other")).toBe(true);
  });

  it("reads a runningon RSS item into a day-precision window", () => {
    const xml = `<?xml version="1.0"?><rss><channel><item>
      <title>테스트 마라톤</title>
      <link>https://runningon.co.kr/races/test</link>
      <description><![CDATA[<ul><li>일시: 2027-03-01 09:00 출발</li><li>장소: 서울 한강</li><li>종목: 하프 · 10km</li><li>참가비: 50,000원부터</li><li>접수: 2026-11-20 ~ 2026-12-01</li><li>접수 상태: 접수 중</li></ul>]]></description>
    </item></channel></rss>`;
    const [race] = parseRunningonRss(xml, "2026-11-22");
    expect(race?.distances).toEqual(["하프", "10km"]);
    expect(race?.window).toEqual(parseRegistrationRange("2026-11-20 ~ 2026-12-01"));
    expect(race?.window.closeAt).toBe("2026-12-02T00:00:00+09:00");
  });

  it("keeps the official 합천 registration url", () => {
    expect(plannedHalf.url).toBe("https://www.hcmrt.or.kr/ko/sub2_3.html");
    expect(curatedRaces.map((race) => race.url)).toContain("https://www.dkrun.co.kr/");
  });
});
