import type { Race } from "@/data/types";
import { countdownLabel, isNewAnnouncement, raceStatus } from "@/lib/windows";

export function NewAnnouncements({ races, now }: { races: Race[]; now: Date }) {
  const fresh = races.filter((race) => isNewAnnouncement(race, now));
  return (
    <section aria-labelledby="new-heading" className="rounded-2xl border border-[#767d89] bg-white p-4 sm:p-6">
      <h2 id="new-heading" className="text-xl font-extrabold tracking-tight">
        새로 올라온 공고
      </h2>
      <p className="mt-1 text-[15px] leading-relaxed text-[#3f4754]">
        최근 7일 안에 접수가 열렸거나, 이전 수집 이후 처음 잡힌 대회입니다.
      </p>
      {fresh.length === 0 ? (
        <p className="mt-4 text-base text-[#1a1d23]">최근 7일 안에 새로 잡힌 공고는 없습니다.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[#d5d8e0] border-y border-[#d5d8e0]">
          {fresh.map((race) => (
            <li key={race.id} className="py-3">
              <a href={`#race-${race.id}`} className="text-base font-bold text-[#1e3a8a] underline-offset-2 hover:underline">
                {race.name}
              </a>
              <p className="mt-1 text-[15px] text-[#1a1d23]">
                {race.date}({race.weekday}) · {race.place} · {raceStatus(race, now) ?? "마감"} · {countdownLabel(race, now)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
