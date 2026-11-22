import { curatedRaces, plannedHalf } from "@/data/curated";
import { OfficialLink } from "@/components/OfficialLink";
import { countdownLabel, formatWindowBound, raceStatus } from "@/lib/windows";

export function PlannedRace({ now }: { now: Date }) {
  const race = curatedRaces.find((item) => item.id === plannedHalf.raceId);
  const window = race?.windows?.[plannedHalf.distance];
  const status = race ? raceStatus(race, now, plannedHalf.distance) : null;
  const openLabel = window?.openAt ? formatWindowBound(window.openAt, "minute", "open") : "";

  return (
    <section aria-labelledby="planned-heading" className="rounded-2xl border-2 border-[#1d4ed8] bg-white p-4 sm:p-6">
      <p className="text-sm font-bold tracking-wide text-[#1e3a8a]">신청 예정 · 하프</p>
      <div className="mt-2 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <h2 id="planned-heading" className="text-[1.7rem] leading-tight font-extrabold tracking-tight text-[#1a1d23] sm:text-3xl">
            {plannedHalf.name}
          </h2>
          <p className="mt-3 text-[17px] leading-relaxed text-[#1a1d23]">
            접수 <span className="whitespace-nowrap font-semibold">{openLabel}</span> 오픈
            <span className="text-[#3f4754]"> · </span>
            대회 <span className="whitespace-nowrap">{plannedHalf.raceDate}</span>
            <span className="text-[#3f4754]"> · </span>
            <span className="whitespace-nowrap">{plannedHalf.place}</span>
          </p>
          <p className="mt-2 text-[17px] text-[#1a1d23]">
            참가비 <span className="font-bold">{plannedHalf.fee}</span>
          </p>
          {race && status ? (
            <p className="mt-3 font-mono text-base font-semibold text-[#1e3a8a]">{countdownLabel(race, now, plannedHalf.distance)}</p>
          ) : null}
        </div>
        <OfficialLink href={plannedHalf.url} name={plannedHalf.name} className="w-full lg:w-auto" />
      </div>
    </section>
  );
}
