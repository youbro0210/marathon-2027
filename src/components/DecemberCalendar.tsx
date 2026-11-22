import { december2026, type CalendarEvent, type CalendarKind } from "@/data/curated";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const kindDot: Record<CalendarKind, string> = {
  open: "bg-[#9a3412]",
  close: "bg-[#1a1d23]",
  refund: "bg-[#0b5c32]",
};

const kindText: Record<CalendarKind, string> = {
  open: "text-[#9a3412]",
  close: "text-[#1a1d23]",
  refund: "text-[#0b5c32]",
};

function weeksOf(year: number, monthIndex: number): Array<Array<number | null>> {
  const start = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: start }, () => null),
    ...Array.from({ length: days }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Array<Array<number | null>> = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

function eventsOn(day: number): CalendarEvent[] {
  return december2026.filter((event) => event.day === day);
}

export function DecemberCalendar() {
  const weeks = weeksOf(2026, 11);

  return (
    <section aria-labelledby="calendar-heading" className="rounded-2xl border border-[#767d89] bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="calendar-heading" className="text-lg font-extrabold tracking-tight">
            12월 주요 일정
          </h2>
          <p className="mt-1 text-base text-[#3f4754]">2026년 12월. 오픈, 마감, 환불만 표시합니다.</p>
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-cherry" /> 오픈
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-ink" /> 마감
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-pine" /> 환불
          </li>
        </ul>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)] md:items-start">
        <table className="w-full table-fixed border-separate border-spacing-1 text-center">
          <caption className="sr-only">2026년 12월 달력</caption>
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
                    weekday !== "일" && weekday !== "토" && "text-muted-foreground",
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
                    return <td key={`${weekIndex}-${dayIndex}`} />;
                  }
                  const events = eventsOn(day);
                  const label =
                    events.length > 0
                      ? `12월 ${day}일 ${WEEKDAYS[dayIndex]}. ${events.map((event) => event.label).join(". ")}`
                      : `12월 ${day}일`;
                  return (
                    <td
                      key={day}
                      aria-label={label}
                      className={cn(
                        "h-12 rounded-md align-middle font-mono text-sm sm:h-14",
                        events.length > 0 ? "bg-[#fff7ed] font-semibold text-[#1a1d23]" : "text-[#1a1d23]",
                      )}
                    >
                      <span className="block leading-none">{day}</span>
                      {events.length > 0 ? (
                        <span className="mt-1 flex justify-center gap-0.5" aria-hidden="true">
                          {events.map((event) => (
                            <span key={event.label} className={cn("size-1.5 rounded-full", kindDot[event.kind])} />
                          ))}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <ol className="divide-y divide-border border-y border-border">
          {december2026.map((event) => (
            <li key={`${event.day}-${event.label}`} className="flex items-baseline gap-3 py-2.5">
              <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">
                12/{event.day}
                <span className="ml-1 font-sans">{WEEKDAYS[new Date(Date.UTC(2026, 11, event.day)).getUTCDay()]}</span>
              </span>
              <span className={cn("text-sm leading-snug font-medium", kindText[event.kind])}>{event.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
