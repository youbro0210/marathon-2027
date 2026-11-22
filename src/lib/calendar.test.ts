import { describe, expect, it } from "vitest";
import { curatedRaces } from "@/data/curated";
import {
  boundTimeLabel,
  eventMonthRange,
  monthIndex,
  scheduleEvents,
  shortRaceName,
} from "@/lib/calendar";
import { windowBoundParts } from "@/lib/windows";

describe("schedule calendar events", () => {
  it("places day-precision midnights on the previous calendar day", () => {
    const daeguClose = windowBoundParts("2026-12-02T00:00:00+09:00", "day", "close");
    expect(daeguClose.ymd).toBe("2026-12-01");
    expect(daeguClose.hour).toBe(23);
    expect(daeguClose.minute).toBe(59);
    expect(boundTimeLabel("2026-12-02T00:00:00+09:00", "day", "close")).toBe("23:59");

    const dadaepoClose = windowBoundParts("2026-12-05T00:00:00+09:00", "day", "close");
    expect(dadaepoClose.ymd).toBe("2026-12-04");
  });

  it("keeps minute-precision close times on the same day", () => {
    const parts = windowBoundParts("2026-12-30T06:00:00+09:00", "minute", "close");
    expect(parts.ymd).toBe("2026-12-30");
    expect(boundTimeLabel("2026-12-30T06:00:00+09:00", "minute", "close")).toBe("6시");
  });

  it("marks open, close, and race days for curated races", () => {
    const events = scheduleEvents(curatedRaces, "관심");
    const labelsOn = (date: string) => events.filter((event) => event.date === date).map((event) => event.label);

    expect(labelsOn("2026-12-01")).toEqual([
      "합천벚꽃마라톤 하프 오픈 10시",
      "대구마라톤 (2차) 마감 23:59",
    ]);
    expect(labelsOn("2026-12-02")).toEqual(["합천벚꽃마라톤 10km·5km 오픈 10시"]);
    expect(labelsOn("2026-12-04")).toEqual(["부산 다대포 마라톤 마감 23:59"]);
    expect(labelsOn("2026-12-07")).toEqual(["전북 3.1절 마라톤 하프 오픈 9시"]);
    expect(labelsOn("2026-12-10")).toEqual(["전북 3.1절 마라톤 하프 마감 23:59"]);
    expect(labelsOn("2026-12-30")).toEqual(["삼일절 마라톤 (뚝섬) 마감 6시"]);
    expect(labelsOn("2027-03-28")).toEqual(["합천벚꽃마라톤 대회일"]);
  });

  it("covers every month that has an event plus the current month", () => {
    const events = scheduleEvents(curatedRaces, "관심");
    const range = eventMonthRange(events, new Date("2026-11-22T16:00:00+09:00"));
    expect(range.min).toBe(monthIndex(2026, 11));
    expect(range.max).toBe(monthIndex(2027, 3));
  });

  it("shortens numbered and year-prefixed race names", () => {
    expect(shortRaceName("제14회 안중근 평화 마라톤 대회")).toBe("안중근 평화 마라톤 대회");
    expect(shortRaceName("2026 평화의숲 마라톤")).toBe("평화의숲 마라톤");
  });
});
