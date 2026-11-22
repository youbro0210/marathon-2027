import { useMemo, useState } from "react";
import { FOCUS_DISTANCES, type Race, type Status } from "@/data/types";
import { OfficialLink } from "@/components/OfficialLink";
import { Button } from "@/components/ui/button";
import {
  countdownLabel,
  distanceStatus,
  formatDistances,
  hostOf,
  isNewAnnouncement,
  opensWithin24h,
  raceStatus,
  registrationLabel,
  visibleRaces,
  windowsFor,
  type DistanceFilter,
  type StatusFilter,
} from "@/lib/windows";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = ["전체", "오픈 예정", "접수 중", "마감"] as const;

const badgeClass: Record<Status, string> = {
  "오픈 예정": "bg-[#fff3d6] text-[#6b3a00]",
  "접수 중": "bg-[#d9f5e4] text-[#0b5c32]",
  마감: "bg-[#eceff3] text-[#3a4250]",
};

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="shrink-0 pr-1 text-[15px] font-bold text-[#3f4754]">{label}</span>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Button
            key={option}
            type="button"
            variant={selected ? "default" : "outline"}
            aria-pressed={selected}
            className="h-11 px-3.5 text-[15px]"
            onClick={() => onChange(option)}
          >
            {option}
          </Button>
        );
      })}
    </div>
  );
}

function RaceCard({ race, now, filter }: { race: Race; now: Date; filter: DistanceFilter }) {
  const status = raceStatus(race, now, filter) ?? "마감";
  const soon = opensWithin24h(race, now, filter);
  const fresh = isNewAnnouncement(race, now);
  const windows = windowsFor(race);
  const distances = filter === "관심" || filter === "전체" ? race.distances : race.distances.filter((item) => item === filter);
  const labels = new Set(
    distances.map((distance) => `${windows[distance]?.openAt ?? ""}|${windows[distance]?.closeAt ?? ""}`),
  );
  const split = labels.size > 1;

  return (
    <article
      id={`race-${race.id}`}
      className={cn(
        "rounded-2xl border bg-white p-4 sm:p-5",
        status === "마감" ? "border-[#767d89] bg-[#f3f4f6]" : "border-[#767d89]",
        soon && "border-2 border-[#9a3412] bg-[#fff7ed]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("inline-flex rounded-full px-2.5 py-1 text-sm font-bold", badgeClass[status])}>{status}</p>
          {soon ? <p className="rounded-full bg-[#ffedd5] px-2.5 py-1 text-sm font-bold text-[#7c2d12]">24시간 내 오픈</p> : null}
          {fresh ? <p className="rounded-full bg-[#dbeafe] px-2.5 py-1 text-sm font-bold text-[#1e3a8a]">새 공고</p> : null}
        </div>
        <p className="text-right text-base text-[#1a1d23]">
          <span className="font-mono">{race.date}</span>
          <span className="text-[#3f4754]">({race.weekday})</span>
        </p>
      </div>
      <h3 className="mt-3 text-xl leading-tight font-extrabold tracking-tight text-[#1a1d23]">{race.name}</h3>
      <p className="mt-1 text-base text-[#3f4754]">{race.place}</p>
      <p className="mt-3 font-mono text-base font-semibold text-[#1a1d23]">{countdownLabel(race, now, filter)}</p>
      {split ? (
        <ul className="mt-3 grid gap-1.5 text-[15px]">
          {distances.map((distance) => {
            const window = windows[distance] ?? { openAt: null, closeAt: null };
            const rowStatus = distanceStatus(window, now);
            return (
              <li key={distance} className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{distance}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-sm font-bold", badgeClass[rowStatus])}>{rowStatus}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      <dl className="mt-4 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-base">
        <dt className="text-[#3f4754]">종목</dt>
        <dd>{formatDistances(race)}</dd>
        <dt className="text-[#3f4754]">접수 기간</dt>
        <dd>{registrationLabel(race)}</dd>
        <dt className="text-[#3f4754]">참가비</dt>
        <dd>{race.fees}</dd>
        {race.note ? (
          <>
            <dt className="text-[#3f4754]">메모</dt>
            <dd>{race.note}</dd>
          </>
        ) : null}
        <dt className="text-[#3f4754]">출처</dt>
        <dd>{race.sourceName}</dd>
      </dl>
      <div className="mt-4 flex flex-col items-start gap-1.5">
        <OfficialLink href={race.url} name={race.name} official={race.official} className="w-full sm:w-auto" />
        <p className="text-sm text-[#3f4754]">{hostOf(race.url)}</p>
      </div>
    </article>
  );
}

export function RaceBoard({ races, now }: { races: Race[]; now: Date }) {
  const [distance, setDistance] = useState<DistanceFilter>("관심");
  const [status, setStatus] = useState<StatusFilter>("전체");
  const distanceOptions = useMemo(() => {
    const extras = [...new Set(races.flatMap((race) => race.distances))].filter(
      (item) => !(FOCUS_DISTANCES as readonly string[]).includes(item),
    );
    return ["관심", "전체", ...FOCUS_DISTANCES, ...extras.sort()] as DistanceFilter[];
  }, [races]);
  const list = visibleRaces(races, distance, status, now);
  const groups: Status[] = ["오픈 예정", "접수 중", "마감"];
  const hints: Record<Status, string> = {
    "오픈 예정": "접수 시작이 빠른 순",
    "접수 중": "마감이 빠른 순 · 마감일이 없으면 아래",
    마감: "대회일 순",
  };

  return (
    <section aria-labelledby="board-heading">
      <div className="sticky top-0 z-20 -mx-4 border-b border-[#767d89] bg-white/95 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:px-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="board-heading" className="text-xl font-extrabold tracking-tight">
            대회 목록
          </h2>
          <p aria-live="polite" className="text-base text-[#3f4754]">
            {list.length === races.length ? `${list.length}개` : `${races.length}개 중 ${list.length}개`}
          </p>
        </div>
        <p className="mt-1 text-[15px] leading-relaxed text-[#3f4754]">기본은 하프·10km·5km입니다. 다른 종목도 고를 수 있습니다.</p>
        <div className="mt-3 grid gap-2.5">
          <FilterGroup label="거리" options={distanceOptions} value={distance} onChange={setDistance} />
          <FilterGroup label="상태" options={STATUS_FILTERS} value={status} onChange={setStatus} />
        </div>
      </div>

      {list.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[#767d89] bg-white px-4 py-12 text-center">
          <p className="text-lg font-bold">이 조건에 맞는 대회가 없습니다.</p>
          <p className="mt-1 text-base text-[#3f4754]">거리나 상태를 전체로 바꿔 보세요.</p>
        </div>
      ) : (
        groups.map((group) => {
          const items = list.filter((race) => raceStatus(race, now, distance) === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mt-6">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-extrabold">{group}</h3>
                <p className="text-[15px] text-[#3f4754]">{hints[group]}</p>
              </div>
              <div className="grid gap-3">
                {items.map((race) => (
                  <RaceCard key={race.id} race={race} now={now} filter={distance} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}
