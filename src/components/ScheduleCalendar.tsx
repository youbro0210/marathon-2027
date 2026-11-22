import { useMemo, useState } from "react";
import type { Race } from "@/data/types";
import {
  type CalendarKind,
  type ScheduleEvent,
  WEEKDAYS,
  eventMonthRange,
  eventsInMonth,
  eventsOnDate,
  fromMonthIndex,
  monthIndex,
  scheduleEvents,
  seoulTodayParts,
  uniqueRacesOnDay,
  weeksOf,
} from "@/lib/calendar";
import type { DistanceFilter } from "@/lib/windows";
import { isoDate } from "@/lib/windows";
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

const kindText: Record<CalendarKind, string> = {
  open: "text-[#9a3412]",
  close: "text-[#1a1d23]",
  race: "text-[#1e3a8a]",
};

const kindWord: Record<CalendarKind, string> = {
  open: "오픈",
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
  const [selected, setSelected] = useState<string | null>(today.ymd);

  const events = useMemo(() => scheduleEvents(races, distance), [races, distance]);
  const range = useMemo(() => eventMonthRange(events, now), [events, now]);
  const currentIndex = monthIndex(cursor.year, cursor.month);
  const canPrev = currentIndex > range.min;
  const canNext = currentIndex < range.max;
  const weeks = weeksOf(cursor.year, cursor.month);
  const monthEvents = eventsInMonth(events, cursor.year, cursor.month);
  const selectedEvents = selected ? eventsOnDate(events, selected) : [];
  const list = selected ? selectedEvents : monthEvents;
  const selectedInMonth = selected?.startsWith(`${isoDate(cursor.year, cursor.month, 1).slice(0, 7)}-`);

  function goTo(year: number, month: number, selectToday = false) {
    setCursor({ year, month });
    if (selectToday && year === today.year && month === today.month) {
      setSelected(today.ymd);
    } else {
      setSelected(null);
    }
  }

  function goToday() {
    goTo(today.year, today.month, true);
  }

  function shift(delta: number) {
    const next = fromMonthIndex(currentIndex + delta);
    goTo(next.year, next.month);
  }

  function toggleDay(date: string) {
    setSelected((current) => (current === date ? null : date));
  }

  return (
    <section aria-labelledby="calendar-heading" className="overflow-x-hidden rounded-2xl border border-[#767d89] bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="calendar-heading" className="text-lg font-extrabold tracking-tight">
            접수 일정 달력
          </h2>
          <p className="mt-1 text-base text-[#3f4754]">오픈, 마감, 대회일을 표시합니다. 날짜를 누르면 그날 일정을 볼 수 있습니다.</p>
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#3f4754]">
          <li className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#9a3412]" /> 오픈
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#1a1d23]" /> 마감
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#1e3a8a]" /> 대회일
          </li>
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 px-3 text-[15px]"
            disabled={!canPrev}
            onClick={() => shift(-1)}
          >
            ◀ 이전 달
          </Button>
          <Button type="button" variant="outline" className="h-11 px-3 text-[15px]" onClick={goToday}>
            오늘
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 px-3 text-[15px]"
            disabled={!canNext}
            onClick={() => shift(1)}
          >
            다음 달 ▶
          </Button>
        </div>
        <p className="min-w-0 text-lg font-extrabold tracking-tight sm:ml-auto sm:text-xl">
          {formatMonth(cursor.year, cursor.month)}
        </p>
      </div>

      <div role="group" aria-label="거리" className="mt-3 flex flex-wrap items-center gap-2">
        <span className="shrink-0 text-[15px] font-bold text-[#3f4754]">거리</span>
        {(["관심", "전체"] as const).map((option) => {
          const selectedFilter = option === distance;
          return (
            <Button
              key={option}
              type="button"
              variant={selectedFilter ? "default" : "outline"}
              aria-pressed={selectedFilter}
              className="h-11 px-3.5 text-[15px]"
              onClick={() => setDistance(option)}
            >
              {option === "관심" ? "관심(하프·10km·5km)" : "전체"}
            </Button>
          );
        })}
      </div>

      <div className="mt-5 grid min-w-0 gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)] md:items-start">
        <table className="w-full min-w-0 table-fixed border-separate border-spacing-1 text-center">
          <caption className="sr-only">{formatMonth(cursor.year, cursor.month)} 달력</caption>
          <thead>
            <tr>
              {WEEKDAYS.map((weekday) => (
                <th
                  key={weekday}
                  scope="col"
                  className={cn(
                    "pb-1 text-sm font-semibold",
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
                    return <td key={`${weekIndex}-${dayIndex}`} className="min-w-0" />;
                  }
                  const date = isoDate(cursor.year, cursor.month, day);
                  const dayEvents = eventsOnDate(events, date);
                  const racesOnDay = uniqueRacesOnDay(dayEvents);
                  const isToday = date === today.ymd;
                  const isSelected = date === selected;
                  const visibleLimit = 2;
                  const visible = racesOnDay.slice(0, visibleLimit);
                  const extra = racesOnDay.length - visible.length;
                  const label =
                    dayEvents.length > 0
                      ? `${cursor.month}월 ${day}일 ${WEEKDAYS[dayIndex]}. ${dayEvents.map((event) => event.label).join(". ")}`
                      : `${cursor.month}월 ${day}일`;
                  return (
                    <td key={day} className="min-w-0 p-0 align-top">
                      <button
                        type="button"
                        aria-label={label}
                        aria-pressed={isSelected}
                        aria-current={isToday ? "date" : undefined}
                        onClick={() => toggleDay(date)}
                        className={cn(
                          "flex h-[4.75rem] w-full min-w-0 flex-col items-stretch rounded-md px-0.5 py-1 text-left sm:h-[5.75rem] sm:px-1",
                          dayEvents.length > 0 ? "bg-[#fff7ed] text-[#1a1d23]" : "text-[#1a1d23]",
                          isToday && "ring-2 ring-[#1d4ed8] ring-inset",
                          isSelected && "bg-[#ffedd5] font-semibold ring-2 ring-[#9a3412] ring-inset",
                        )}
                      >
                        <span className={cn("font-mono text-sm leading-none", isToday && "font-extrabold")}>{day}</span>
                        <span className="mt-1 flex min-w-0 flex-col gap-0.5" aria-hidden="true">
                          {visible.map((item) => (
                            <span key={item.raceId} className="flex min-w-0 items-center gap-0.5">
                              <span className="flex shrink-0 gap-px">
                                {item.kinds.map((kind) => (
                                  <span key={kind} className={cn("size-1 rounded-full sm:size-1.5", kindDot[kind])} />
                                ))}
                              </span>
                              <span className="min-w-0 truncate text-[9px] leading-tight font-medium sm:text-[10px]">
                                {item.shortName}
                              </span>
                            </span>
                          ))}
                          {extra > 0 ? (
                            <span className="truncate text-[9px] leading-tight font-bold text-[#3f4754] sm:text-[10px]">
                              +{extra}개
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-extrabold">
              {selected && selectedInMonth
                ? `${Number(selected.slice(5, 7))}월 ${Number(selected.slice(8, 10))}일 (${weekdayOf(selected)})`
                : `${cursor.month}월 전체`}
            </h3>
            {selected && selectedInMonth ? (
              <Button type="button" variant="ghost" className="h-9 px-2 text-[15px]" onClick={() => setSelected(null)}>
                이달 전체
              </Button>
            ) : (
              <p className="text-[15px] text-[#3f4754]">{monthEvents.length}건</p>
            )}
          </div>
          {list.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-[#767d89] px-3 py-8 text-center text-base text-[#3f4754]">
              {selected && selectedInMonth ? "이 날 일정이 없습니다." : "이달에 표시할 일정이 없습니다."}
            </p>
          ) : (
            <ol className="mt-1 max-h-[28rem] divide-y divide-[#767d89] overflow-y-auto border-y border-[#767d89]">
              {list.map((event) => (
                <DayEventItem key={event.id} event={event} selected={Boolean(selected && selectedInMonth)} />
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

function DayEventItem({ event, selected }: { event: ScheduleEvent; selected: boolean }) {
  const dateLabel = selected
    ? null
    : `${Number(event.date.slice(5, 7))}/${Number(event.date.slice(8, 10))}`;
  return (
    <li className="py-2.5">
      <a href={`#race-${event.raceId}`} className="flex min-w-0 items-baseline gap-3 rounded-md hover:bg-[#f8fafc]">
        <span className="w-16 shrink-0 font-mono text-xs text-[#3f4754]">
          {dateLabel ? (
            <>
              {dateLabel}
              <span className="ml-1 font-sans">{weekdayOf(event.date)}</span>
            </>
          ) : (
            <span className={cn("rounded-full px-2 py-0.5 font-sans text-[11px] font-bold", kindChip[event.kind])}>
              {kindWord[event.kind]}
            </span>
          )}
        </span>
        <span className={cn("min-w-0 text-sm leading-snug font-medium", kindText[event.kind])}>{event.label}</span>
      </a>
    </li>
  );
}
