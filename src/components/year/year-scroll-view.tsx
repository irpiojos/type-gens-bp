"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppNav, MetaStack } from "@/components/layout/app-nav";
import { Modal } from "@/components/ui/modal";
import { COMMENT_COLORS, MONTH_COLORS } from "@/lib/constants";
import { deleteDatedComment, upsertDatedComment } from "@/lib/actions";
import { useToast } from "@/components/ui/toast";
import {
  allISOWeeksInYear,
  contextMeta,
  currentISOWeek,
  format,
  getMonth,
  toISODate,
  weekStart,
  addDays,
  isWeekend,
} from "@/lib/dates";
import type { getYearScrollData } from "@/lib/queries";
import type { DatedComment, Holiday } from "@/lib/db/schema";
import clsx from "clsx";

type Data = NonNullable<Awaited<ReturnType<typeof getYearScrollData>>>;

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export function YearScrollView({ data }: { data: Data }) {
  const router = useRouter();
  const { undoableDelete } = useToast();
  const weeks = useMemo(() => allISOWeeksInYear(data.year.yearNumber), [data.year.yearNumber]);
  const current = currentISOWeek();
  const meta = contextMeta(data.year.yearNumber, current);
  const [commentOpen, setCommentOpen] = useState(false);
  const [editing, setEditing] = useState<DatedComment | null>(null);
  const [draft, setDraft] = useState<{
    text: string;
    startDate: string;
    endDate: string;
    color: string;
  }>({
    text: "",
    startDate: "",
    endDate: "",
    color: COMMENT_COLORS[0],
  });
  const [, start] = useTransition();
  const [hoverRange, setHoverRange] = useState<{ start: string; end: string } | null>(null);
  const drag = useMemo(() => ({ start: null as string | null }), []);

  useEffect(() => {
    document.body.classList.add("bg-scroll");
    return () => document.body.classList.remove("bg-scroll");
  }, []);

  useEffect(() => {
    document.getElementById(`yscroll-w${current}`)?.scrollIntoView({ block: "center" });
  }, [current]);

  const pairs: number[][] = [];
  for (let i = 0; i < weeks.length; i += 2) {
    pairs.push(weeks.slice(i, i + 2));
  }

  function holidayOn(iso: string): Holiday | undefined {
    return data.holidays.find((h) => h.startDate <= iso && h.endDate >= iso);
  }

  function commentsOn(iso: string) {
    return data.comments.filter((c) => c.startDate <= iso && c.endDate >= iso);
  }

  function openComment(pre?: Partial<typeof draft>, existing?: DatedComment) {
    setEditing(existing ?? null);
    setDraft({
      text: existing?.text ?? pre?.text ?? "",
      startDate: existing?.startDate ?? pre?.startDate ?? "",
      endDate: existing?.endDate ?? pre?.endDate ?? pre?.startDate ?? "",
      color: existing?.color ?? pre?.color ?? COMMENT_COLORS[0],
    });
    setCommentOpen(true);
  }

  function weekDays(week: number) {
    const start = weekStart(data.year.yearNumber, week);
    return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(start, i));
  }

  function renderWeek(w: number) {
    const days = weekDays(w);
    return (
      <div key={w} id={`yscroll-w${w}`} className="min-w-0">
        <div className="flex">
          <div className="yscroll-weeknum w-7 shrink-0 self-stretch border border-black/10 text-[10px]">
            W{w}
          </div>
          <div className="grid flex-1 grid-cols-7 border border-l-0 border-black/10">
            {days.map((d) => {
              const iso = toISODate(d);
              const month = getMonth(d) + 1;
              const bg = MONTH_COLORS[month];
              const count = data.counts[iso] ?? 0;
              const hol = holidayOn(iso);
              const weekend = isWeekend(d);
              const comments = commentsOn(iso);
              const isMonthStart = d.getDate() === 1;
              const greyed = weekend || (!!hol && !hol.isHalfDay);
              const inHover =
                hoverRange && iso >= hoverRange.start && iso <= hoverRange.end;
              return (
                <div
                  key={iso}
                  data-day={iso}
                  className={clsx(
                    "relative min-h-[52px] border border-black/5 p-0.5 text-[10px]",
                    greyed && "yscroll-weekend",
                    inHover && "ring-1 ring-blue-400",
                  )}
                  style={{ backgroundColor: greyed ? undefined : bg }}
                  onMouseDown={() => {
                    drag.start = iso;
                    setHoverRange({ start: iso, end: iso });
                  }}
                  onMouseEnter={() => {
                    if (!drag.start) return;
                    const start = drag.start <= iso ? drag.start : iso;
                    const end = drag.start <= iso ? iso : drag.start;
                    setHoverRange({ start, end });
                  }}
                  onMouseUp={() => {
                    if (drag.start && hoverRange) {
                      openComment({
                        startDate: hoverRange.start,
                        endDate: hoverRange.end,
                        text: "",
                      });
                    }
                    drag.start = null;
                    setHoverRange(null);
                  }}
                  onDoubleClick={() =>
                    router.push(`/?year=${data.year.yearNumber}&week=${w}`)
                  }
                >
                  <div className="flex justify-between">
                    <span>{d.getDate()}</span>
                    {isMonthStart ? (
                      <span className="font-bold">{format(d, "MMM")}</span>
                    ) : null}
                  </div>
                  {hol ? (
                    <div className="leading-tight text-[9px] text-ink/70">
                      {hol.isHalfDay ? `½ ${hol.name}` : hol.name}
                    </div>
                  ) : null}
                  {count > 0 ? (
                    <button
                      type="button"
                      className="absolute inset-0 flex items-center justify-center text-base font-bold text-ink/70"
                      onClick={() =>
                        router.push(`/?year=${data.year.yearNumber}&week=${w}`)
                      }
                    >
                      {count}
                    </button>
                  ) : null}
                  {comments.map((c) =>
                    c.startDate === iso ? (
                      <button
                        key={c.id}
                        type="button"
                        data-comment
                        className="relative z-10 mt-0.5 w-full truncate rounded-sm px-0.5 text-left text-[9px] font-bold"
                        style={{ backgroundColor: c.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openComment(undefined, c);
                        }}
                      >
                        {c.text || "+ comment"}
                      </button>
                    ) : c.startDate < iso && c.endDate >= iso ? (
                      <div
                        key={c.id}
                        className="mt-0.5 h-3 rounded-sm"
                        style={{ backgroundColor: c.color }}
                      />
                    ) : null,
                  )}
                  {inHover && hoverRange?.start === iso ? (
                    <div className="mt-0.5 rounded-sm bg-[#bfdbfe] px-0.5 text-[9px]">
                      + New Dated Comment
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell page-shell-scroll">
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

      {/* Day letters once at top — mirrored for two columns on desktop */}
      <div className="mb-1 grid gap-2 lg:grid-cols-2">
        {[0, 1].map((col) => (
          <div key={col} className={clsx("flex text-[10px] text-ink/45", col === 1 && "hidden lg:flex")}>
            <span className="w-7 shrink-0" />
            <div className="grid flex-1 grid-cols-7">
              {DAY_LETTERS.map((l, i) => (
                <span key={`${col}-${l}-${i}`} className="text-center font-bold">
                  {l}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {pairs.map((pair) => (
          <div key={pair.join("-")} className="grid gap-2 lg:grid-cols-2">
            {pair.map((w) => renderWeek(w))}
          </div>
        ))}
      </div>

      <Modal
        open={commentOpen}
        onOpenChange={setCommentOpen}
        title={editing ? "Edit Comment" : "New Dated Comment"}
      >
        <div className="grid gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-ink/60">Text</span>
            <input
              className="field"
              value={draft.text}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
              placeholder="Pitches Season"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">
              <span className="mb-1 block text-ink/60">Start</span>
              <input
                type="date"
                className="field"
                value={draft.startDate}
                onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-ink/60">End</span>
              <input
                type="date"
                className="field"
                value={draft.endDate}
                onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
              />
            </label>
          </div>
          <div>
            <p className="mb-1 text-sm text-ink/60">Color</p>
            <div className="flex flex-wrap gap-2">
              {COMMENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={clsx(
                    "h-7 w-7 rounded-full border",
                    draft.color === c ? "border-black" : "border-black/20",
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setDraft((d) => ({ ...d, color: c }))}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          {editing ? (
            <button
              type="button"
              className="btn-warn"
              onClick={() =>
                start(async () => {
                  await deleteDatedComment(editing.id);
                  undoableDelete("comment", editing.id, "Comment deleted");
                  setCommentOpen(false);
                })
              }
            >
              Delete
            </button>
          ) : null}
          <button
            type="button"
            className="btn-outline"
            onClick={() =>
              start(async () => {
                await upsertDatedComment({
                  id: editing?.id,
                  yearId: data.year.id,
                  ...draft,
                });
                setCommentOpen(false);
              })
            }
          >
            Save
          </button>
        </div>
      </Modal>
    </div>
  );
}