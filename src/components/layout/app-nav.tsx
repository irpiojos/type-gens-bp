"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { contextMeta } from "@/lib/dates";

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
  const meta = contextMeta(yearNumber, week);
  const isGoals = pathname.startsWith("/goals");
  const isYear = pathname.startsWith("/year") && !pathname.includes("year-scroll");
  const isScroll = pathname.startsWith("/year-scroll");
  const isWeek = pathname === "/" || pathname.startsWith("/week");

  return (
    <header className="mb-4 flex flex-col gap-3 sm:mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 text-sm text-ink/70">
          {isGoals ? null : (
            <p>
              {yearNumber} The Year Of{" "}
              <Link
                href={`/goals?year=${yearNumber}`}
                className="font-medium text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink"
              >
                {theme || "…"}
              </Link>
              {isScroll ? " — In One Page Scroll" : null}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isYear ? (
            <Link
              href={`/year-scroll?year=${yearNumber}`}
              className="rounded-lg border border-black/20 bg-white px-2.5 py-1.5 text-xs hover:bg-black/[0.03]"
            >
              🥚 In one Scroll
            </Link>
          ) : null}
          <Link
            href={`/?year=${yearNumber}&week=${week}`}
            className={clsx(
              "rounded-lg border px-2.5 py-1.5 text-xs",
              isWeek ? "border-black/30 bg-white font-medium" : "border-black/15 bg-white/70",
            )}
          >
            W{week}
          </Link>
          <Link
            href={`/year?year=${yearNumber}`}
            className={clsx(
              "rounded-lg border px-2.5 py-1.5 text-xs",
              isYear ? "border-black bg-[#d9d9d9] font-medium" : "border-black/25 bg-white",
            )}
          >
            Year View
          </Link>
          <Link
            href={`/goals?year=${yearNumber}`}
            className={clsx(
              "rounded-lg border px-2.5 py-1.5 text-xs",
              isGoals ? "border-black bg-[#d9d9d9] font-medium" : "border-black/25 bg-white",
            )}
          >
            Goals / Settings
          </Link>
        </div>
      </div>
      {!isGoals && (
        <div className="hidden text-right text-[11px] leading-tight text-ink/55 sm:block sm:absolute sm:right-6 sm:top-24">
          <div>{meta.year}</div>
          <div>{meta.quarter}</div>
          <div>{meta.season}</div>
        </div>
      )}
      {isGoals && (
        <p className="text-right text-xs text-ink/55 sm:absolute sm:right-6 sm:top-20">
          {meta.label}
        </p>
      )}
      <span className="sr-only">{yearId}</span>
    </header>
  );
}