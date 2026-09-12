"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function AppNav({
  yearNumber,
  week,
  theme,
  yearId,
}: {
  yearNumber: number;
  week: number;
  theme: string;
  yearId: string;
}) {
  const pathname = usePathname();
  const isGoals = pathname.startsWith("/goals");
  const isRecap = pathname.startsWith("/recap");
  const isYear = pathname.startsWith("/year") && !pathname.includes("year-scroll");
  const isScroll = pathname.startsWith("/year-scroll");
  const isWeek = pathname === "/" || pathname.startsWith("/week");

  return (
    <header className="mb-3 flex flex-col gap-3 sm:mb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 self-start text-sm text-ink/70">
          {isGoals || isRecap ? null : (
            <p>
              {yearNumber} The Year Of{" "}
              <Link
                href={`/goals?year=${yearNumber}`}
                className="font-light text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink"
              >
                {theme || "…"}
              </Link>
              {isScroll ? " — In One Page Scroll" : null}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {isYear ? (
            <Link
              href={`/year-scroll?year=${yearNumber}`}
              className="btn-nav text-xs"
            >
              🥚 In one Scroll
            </Link>
          ) : null}
          <Link
            href={`/?year=${yearNumber}&week=${week}`}
            className={clsx("btn-nav text-xs", isWeek && "is-selected")}
          >
            W{week}
          </Link>
          <Link
            href={`/year?year=${yearNumber}`}
            className={clsx("btn-nav text-xs", isYear && "is-selected")}
          >
            Year View
          </Link>
          <Link
            href={`/recap?year=${yearNumber}`}
            className={clsx("btn-nav text-xs", isRecap && "is-selected")}
          >
            Recap
          </Link>
          <Link
            href={`/goals?year=${yearNumber}`}
            className={clsx("btn-nav text-xs", isGoals && "is-selected")}
          >
            Goals / Settings
          </Link>
        </div>
      </div>
      <span className="sr-only">{yearId}</span>
    </header>
  );
}

export function MetaStack({
  year,
  quarter,
  season,
  className,
}: {
  year: number | string;
  quarter: string;
  season: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "shrink-0 text-right text-[11px] leading-tight text-ink/55",
        className,
      )}
    >
      <div>{year}</div>
      <div>{quarter}</div>
      <div>{season}</div>
    </div>
  );
}