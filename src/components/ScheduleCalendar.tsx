import { useMemo, useState } from "react";
import type { Race } from "@/data/types";
import {
  type CalendarKind,
  type ScheduleEvent,
  WEEKDAYS,
  defaultSelectedDate,
  eventMonthRange,
  eventsOnDate,
  fromMonthIndex,
  kindsOnDay,
  monthIndex,
  scheduleEvents,
  seoulTodayParts,
  weeksOf,
} from "@/lib/calendar";
import { type DistanceFilter, hostOf } from "@/lib/windows";
import { OfficialLink } from "@/components/OfficialLink";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const kindDot: Record<CalendarKind, string> = {
  open: "bg-[#9a3412]",
  close: "bg-[#1a1d23]",
  race: "bg-[#1e3a8a]",
};

const kindChip: Record<CalendarKind, string> = {
  open: "bg-[#ffedd5] text-[#9a3412]",
  close: "bg-[#eceff3] text-[#1a1d23]",
  race: "bg-[#dbeafe] text-[#1e3a8a]",
};

const kindTitle: Record<CalendarKind, string> = {
  open: "접수 시작",
  close: "마감",
  race: "대회일",
};

function weekdayOf(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)).getUTCDay()] ?? "";
}

function formatMonth(year: number, month: number): string {
  return `${year}년 ${month}월`;
}

export function ScheduleCalendar({ races, now }: { races: Race[]; now: Date }) {
  const today = seoulTodayParts(now);
  const [distance, setDistance] = useState<DistanceFilter>("관심");
  const [cursor, setCursor] = useState({ year: today.year, month: today.month });
  const [selected, setSelected] = useState(today.ymd);
  const raceMap = useMemo(() => new Map(races.map((race) => [race.id, race])), [races]);

  const events = useMemo(() => scheduleEvents(races, distance), [races, distance]);
  const range = useMemo(() => eventMonthRange(events, now), [events, now]);
  const currentIndex = monthIndex(cursor.year, cursor.month);
  const canPrev = currentIndex > range.min;
  const canNext = currentIndex < range.max;
  const weeks = weeksOf(cursor.year, cursor.month);
  const dayEvents = eventsOnDate(events, selected);

  function goTo(year: number, month: number) {
    setCursor({ year, month });
    setSelected(defaultSelectedDate(events, year, month, today));
  }

  function shift(delta: number) {
    const next = fromMonthIndex(currentIndex + delta);
    goTo(next.year, next.month);
  }

  return (
    <section aria-labelledby="calendar-heading" className="overflow-x-hidden rounded-2xl border border-[#767d89] bg-white p-3 sm:p-6">
      <div className="min-w-0">
        <h2 id="calendar-heading" className="text-lg font-extrabold tracking-tight sm:text-xl">
          접수 일정 달력
        </h2>
        <p className="mt-1 text-base leading-relaxed text-[#3f4754]">
          날짜를 누르면 그날의 접수 시작, 마감, 대회일을 볼 수 있습니다.
        </p>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-base text-[#3f4754]">
        <li className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#9a3412]" /> 접수 시작
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#1a1d23]" /> 마감
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#1e3a8a]" /> 대회일
        </li>
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className="h-11 px-3 text-base" disabled={!canPrev} onClick={() => shift(-1)}>
          ◀ 이전 달
        </Button>
        <Button type="button" variant="outline" className="h-11 px-3 text-base" onClick={() => goTo(today.year, today.month)}>
          오늘
        </Button>
        <Button type="button" variant="outline" className="h-11 px-3 text-base" disabled={!canNext} onClick={() => shift(1)}>
          다음 달 ▶
        </Button>
      </div>
      <p className="mt-3 text-center text-xl font-extrabold tracking-tight">{formatMonth(cursor.year, cursor.month)}</p>

      <div role="group" aria-label="거리" className="mt-3 flex flex-wrap items-center gap-2">
        <span className="shrink-0 text-base font-bold text-[#3f4754]">거리</span>
        {(["관심", "전체"] as const).map((option) => {
          const selectedFilter = option === distance;
          return (
            <Button
              key={option}
              type="button"
              variant={selectedFilter ? "default" : "outline"}
              aria-pressed={selectedFilter}
              className="h-11 px-3.5 text-base"
              onClick={() => setDistance(option)}
            >
              {option === "관심" ? "관심 종목" : "전체"}
            </Button>
          );
        })}
      </div>
      <p className="mt-1 text-base text-[#3f4754]">관심 종목은 하프·10km·5km입니다.</p>

      <table className="mt-4 w-full min-w-0 table-fixed border-collapse">
        <caption className="sr-only">{formatMonth(cursor.year, cursor.month)} 달력</caption>
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th
                key={weekday}
                scope="col"
                className={cn(
                  "border border-[#767d89] bg-[#f8fafc] py-2 text-base font-bold",
                  weekday === "일" && "text-[#9a3412]",
                  weekday === "토" && "text-[#2f5d86]",
                  weekday !== "일" && weekday !== "토" && "text-[#3f4754]",
                )}
              >
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((day, dayIndex) => {
                if (day === null) {
                  return <td key={`${weekIndex}-${dayIndex}`} className="min-w-0 border border-[#d5d8de] bg-[#f8fafc]" />;
                }
                const date = `${cursor.year}-${String(cursor.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const kinds = kindsOnDay(eventsOnDate(events, date));
                const isToday = date === today.ymd;
                const isSelected = date === selected;
                const weekday = WEEKDAYS[dayIndex];
                const label =
                  kinds.length > 0
                    ? `${cursor.month}월 ${day}일 ${weekday}. ${kinds.map((kind) => kindTitle[kind]).join(", ")}`
                    : `${cursor.month}월 ${day}일`;
                return (
                  <td key={day} className="min-w-0 border border-[#767d89] p-0">
                    <button
                      type="button"
                      aria-label={label}
                      aria-pressed={isSelected}
                      aria-current={isToday ? "date" : undefined}
                      onClick={() => setSelected(date)}
                      className={cn(
                        "flex min-h-11 w-full min-w-0 flex-col items-center justify-center px-0.5 py-1.5",
                        isSelected && "bg-[#ffedd5]",
                        !isSelected && kinds.length > 0 && "bg-[#fff7ed]",
                        isToday && !isSelected && "bg-[#eff6ff]",
                        isToday && "shadow-[inset_0_0_0_2px_#1d4ed8]",
                        isSelected && "shadow-[inset_0_0_0_2px_#9a3412]",
                      )}
                    >
                      <span
                        className={cn(
                          "text-lg leading-none font-bold",
                          weekday === "일" && "text-[#9a3412]",
                          weekday === "토" && "text-[#2f5d86]",
                          weekday !== "일" && weekday !== "토" && "text-[#1a1d23]",
                        )}
                      >
                        {day}
                      </span>
                      <span className="mt-1 flex h-2.5 items-center justify-center gap-0.5" aria-hidden="true">
                        {kinds.map((kind) => (
                          <span key={kind} className={cn("size-2 rounded-full", kindDot[kind])} />
                        ))}
                      </span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-5 min-w-0">
        <h3 className="text-lg font-extrabold tracking-tight">
          {Number(selected.slice(5, 7))}월 {Number(selected.slice(8, 10))}일 ({weekdayOf(selected)})
          {selected === today.ymd ? " · 오늘" : ""}
        </h3>
        {dayEvents.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-[#767d89] px-4 py-8 text-center text-base text-[#3f4754]">
            이 날 일정이 없습니다.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {dayEvents.map((event) => (
              <DayCard key={event.id} event={event} race={raceMap.get(event.raceId)} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function DayCard({ event, race }: { event: ScheduleEvent; race: Race | undefined }) {
  const timeText =
    event.kind === "race" ? "대회 당일" : event.time ? event.time : "시각 미상";
  return (
    <li>
      <article className="rounded-2xl border border-[#767d89] bg-white p-4">
        <p className={cn("inline-flex rounded-full px-2.5 py-1 text-base font-bold", kindChip[event.kind])}>
          {kindTitle[event.kind]}
        </p>
        <h4 className="mt-2 text-xl leading-tight font-extrabold tracking-tight text-[#1a1d23]">{event.raceName}</h4>
        <dl className="mt-3 grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-base">
          <dt className="text-[#3f4754]">시각</dt>
          <dd className="font-semibold">{timeText}</dd>
          <dt className="text-[#3f4754]">종목</dt>
          <dd>{event.distances.join(" · ")}</dd>
        </dl>
        {race ? (
          <div className="mt-4 flex flex-col items-start gap-1.5">
            <OfficialLink href={race.url} name={race.name} official={race.official} className="w-full sm:w-auto" />
            <p className="text-base text-[#3f4754]">{hostOf(race.url)}</p>
          </div>
        ) : null}
      </article>
    </li>
  );
}
