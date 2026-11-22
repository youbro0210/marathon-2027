import { curatedRaces, FOOTER_NOTICE, UNANNOUNCED, VERIFIED_ON } from "@/data/curated";
import scrapedFile from "@/data/scraped.json";
import type { Race, ScrapedFile } from "@/data/types";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";
import { NewAnnouncements } from "@/components/NewAnnouncements";
import { PlannedRace } from "@/components/PlannedRace";
import { RaceBoard } from "@/components/RaceBoard";
import { mergeRaces } from "@/lib/merge";
import { useNow } from "@/lib/useNow";
import { formatNow, raceStatus } from "@/lib/windows";

const scraped = scrapedFile as ScrapedFile;

export default function App() {
  const now = useNow();
  const races: Race[] = mergeRaces(curatedRaces, scraped.races);
  const counts = {
    upcoming: races.filter((race) => raceStatus(race, now) === "오픈 예정").length,
    open: races.filter((race) => raceStatus(race, now) === "접수 중").length,
    closed: races.filter((race) => raceStatus(race, now) === "마감").length,
  };
  const collected = scraped.collectedAt
    ? formatNow(new Date(scraped.collectedAt))
    : "아직 수집 전";

  return (
    <div className="min-h-svh bg-white text-[#1a1d23]">
      <header className="border-b border-[#767d89] bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-[#3f4754]">
            <p>하프 · 10km · 5km</p>
            <p>일정 확인 {VERIFIED_ON}</p>
          </div>
          <h1 className="mt-3 text-[2rem] leading-tight font-extrabold tracking-tight text-balance sm:text-5xl">
            2027 마라톤 접수 일정
          </h1>
          <p className="mt-3 max-w-2xl text-[17px] leading-relaxed sm:text-base">
            접수 상태는 한국 시간 기준으로 1초마다 다시 계산합니다. 이 화면은 상태만 보여 주고, 신청은 각 공식 사이트에서 합니다.
          </p>
          <p className="mt-4 rounded-xl bg-[#f8fafc] px-3 py-2 font-mono text-base text-[#1a1d23]" aria-hidden="true">
            지금 {formatNow(now)}
          </p>
          <p className="mt-2 text-[15px] text-[#3f4754]">공고 수집 {collected}</p>
          <dl className="mt-5 flex gap-6">
            <div>
              <dt className="text-sm font-bold text-[#6b3a00]">오픈 예정</dt>
              <dd className="text-3xl font-bold">{counts.upcoming}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-[#0b5c32]">접수 중</dt>
              <dd className="text-3xl font-bold">{counts.open}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-[#3a4250]">마감</dt>
              <dd className="text-3xl font-bold">{counts.closed}</dd>
            </div>
          </dl>
        </div>
      </header>

      <main className="mx-auto grid max-w-4xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <PlannedRace now={now} />
        <ScheduleCalendar races={races} now={now} />
        <NewAnnouncements races={races} now={now} />
        <RaceBoard races={races} now={now} />
      </main>

      <footer className="border-t border-[#767d89] bg-[#f8fafc]">
        <div className="mx-auto max-w-4xl px-4 py-8 text-base leading-relaxed text-[#1a1d23] sm:px-6">
          <p>{FOOTER_NOTICE}</p>
          <p className="mt-3">{UNANNOUNCED}</p>
          <p className="mt-3 text-[15px] text-[#3f4754]">
            수집 출처: 러닝온 RSS, 런파인더 접수중 목록. 런닝인사이드·러너블 한국어 경로·투게더런 대량 페이지는 수집하지 않습니다. 직접 확인한 12개 대회는 같은 이름이면 수집 결과보다 우선합니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
