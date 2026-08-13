"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppNav, MetaStack } from "@/components/layout/app-nav";
import { TaskChip } from "@/components/task/task-chip";
import {
  allISOWeeksInYear,
  contextMeta,
  currentISOWeek,
  currentYearNumber,
  formatDayHeader,
  isNewCalendarQuarter,
  quarterAndSeason,
  toISODate,
  weekWorkdays,
} from "@/lib/dates";
import type { getYearListData } from "@/lib/queries";
import clsx from "clsx";

type Data = NonNullable<Awaited<ReturnType<typeof getYearListData>>>;

export function YearView({ data }: { data: Data }) {
  const router = useRouter();
  const weeks = useMemo(() => allISOWeeksInYear(data.year.yearNumber), [data.year.yearNumber]);
  const current = currentISOWeek();
  const meta = contextMeta(data.year.yearNumber, current);

  useEffect(() => {
    const el = document.getElementById(`week-row-${current}`);
    if (el) el.scrollIntoView({ block: "center" });
  }, [current]);

  function tasksForDay(iso: string) {
    return data.tasks.filter(
      (t) => t.startDate && t.endDate && t.startDate <= iso && t.endDate >= iso,
    );
  }

  return (
    <div className="page-shell">
      <div className="sticky-year-header">
        <AppNav
          yearNumber={data.year.yearNumber}
          week={current}
          theme={data.year.theme}
          yearId={data.year.id}
        />
        <div className="flex items-end justify-between gap-4">
          <h1 className="font-display text-5xl tracking-tight sm:text-6xl">
            {data.year.yearNumber}
          </h1>
          <MetaStack year={meta.year} quarter={meta.quarter} season={meta.season} />
        </div>
      </div>

      <div className="space-y-6">
        {weeks.map((w, idx) => {
          const days = weekWorkdays(data.year.yearNumber, w);
          const q = quarterAndSeason(days[0]);
          const prev = idx > 0 ? weeks[idx - 1] : null;
          const showQuarter = isNewCalendarQuarter(data.year.yearNumber, w, prev);
          const isCurrent = w === current && data.year.yearNumber === currentYearNumber();
          return (
            <div key={w} id={`week-row-${w}`}>
              {showQuarter ? (
                <p className="mb-2 text-center text-xs tracking-widest text-ink/40">
                  — {q.quarter} - {q.season} —
                </p>
              ) : null}
              <div
                className={clsx(
                  "rounded-xl border border-black/15 bg-white p-2 transition hover:border-black/50",
                  isCurrent && "week-row-current",
                )}
              >
                <div className="mb-1 text-xs font-bold text-ink/50">W{w}</div>
                <div className="grid grid-cols-5 gap-1.5 overflow-x-auto">
                  {days.map((d) => {
                    const iso = toISODate(d);
                    const dayTasks = tasksForDay(iso);
                    return (
                      <button
                        key={iso}
                        type="button"
                        className="min-h-[72px] rounded-lg border border-transparent p-1 text-left hover:border-black/30 hover:bg-black/[0.02]"
                        onClick={() =>
                          router.push(`/?year=${data.year.yearNumber}&week=${w}`)
                        }
                      >
                        <div className="mb-1 text-[11px] text-ink/55">
                          {formatDayHeader(d)}
                        </div>
                        <div className="space-y-1">
                          {dayTasks.slice(0, 3).map((t) => (
                            <TaskChip key={t.id} task={t} compact className="pointer-events-none" />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}