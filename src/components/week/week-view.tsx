"use client";

import { useRouter } from "next/navigation";
import { AppNav, MetaStack } from "@/components/layout/app-nav";
import {
  TaskChip,
  type TaskDragPayload,
  isSingleDayOrUnscheduled,
} from "@/components/task/task-chip";
import { TaskModal, type TaskModalPrefill } from "@/components/task/task-modal";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { rescheduleTask, saveCheckIn } from "@/lib/actions";
import {
  addWeekClamped,
  contextMeta,
  formatDayHeader,
  formatMonthDay,
  toISODate,
  todayISO,
  weekWorkdays,
} from "@/lib/dates";
import type { getWeekPageData } from "@/lib/queries";
import { layoutSpanningTasks } from "@/lib/week-layout";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import clsx from "clsx";

type Data = NonNullable<Awaited<ReturnType<typeof getWeekPageData>>>;

export function WeekView({ data }: { data: Data }) {
  const router = useRouter();
  const meta = contextMeta(data.year.yearNumber, data.week);
  const [adjacent, setAdjacent] = useState<"prev" | "next" | null>(data.adjacent);
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Data["weekTasks"][number] | null>(null);
  const [prefill, setPrefill] = useState<TaskModalPrefill | undefined>();
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const drag = useRef<{ start: string; end: string; week: number } | null>(null);
  const [dragRange, setDragRange] = useState<{ start: string; end: string } | null>(null);
  const longPress = useRef<number | null>(null);
  const [, startTx] = useTransition();
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<
    Record<string, { unscheduled: boolean; startDate: string | null; endDate: string | null }>
  >({});

  const weekBlocks = useMemo(() => {
    return data.weeks.map((w) => ({
      week: w,
      days: weekWorkdays(data.year.yearNumber, w),
    }));
  }, [data.weeks, data.year.yearNumber]);

  const weekTasks = useMemo(() => {
    return data.weekTasks.map((t) => {
      const o = overrides[t.id];
      return o ? { ...t, ...o } : t;
    });
  }, [data.weekTasks, overrides]);

  const unscheduledTasks = useMemo(() => {
    const byId = new Map<string, (typeof weekTasks)[number]>();
    for (const t of data.unscheduled) {
      const o = overrides[t.id];
      byId.set(t.id, o ? { ...t, ...o } : t);
    }
    for (const t of weekTasks) {
      if (t.unscheduled) byId.set(t.id, t);
    }
    return [...byId.values()].filter((t) => t.unscheduled);
  }, [data.unscheduled, weekTasks, overrides]);

  function readDrag(e: React.DragEvent): TaskDragPayload | null {
    const raw =
      e.dataTransfer.getData("application/x-ttm-task") ||
      e.dataTransfer.getData("text/plain");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as TaskDragPayload;
      if (parsed?.taskId && parsed?.source) return parsed;
    } catch {
      return null;
    }
    return null;
  }

  function applyDrop(
    payload: TaskDragPayload,
    target: { kind: "day"; date: string } | { kind: "unscheduled" } | { kind: "member" },
  ) {
    // Spec: no member-list ↔ day-column drag
    if (payload.source === "member" && target.kind === "day") return;
    if (payload.source === "day" && target.kind === "member") return;

    const all = [...data.weekTasks, ...data.unscheduled];
    const base = all.find((t) => t.id === payload.taskId);
    if (!base) return;
    const task = overrides[base.id] ? { ...base, ...overrides[base.id] } : base;
    if (!isSingleDayOrUnscheduled(task)) return;

    let next: { unscheduled: boolean; startDate: string | null; endDate: string | null };
    if (target.kind === "unscheduled") {
      next = { unscheduled: true, startDate: null, endDate: null };
    } else if (target.kind === "day") {
      next = { unscheduled: false, startDate: target.date, endDate: target.date };
    } else {
      // unscheduled → member list: stay unscheduled (assignees unchanged)
      next = { unscheduled: true, startDate: null, endDate: null };
    }

    if (
      !!task.unscheduled === next.unscheduled &&
      task.startDate === next.startDate &&
      task.endDate === next.endDate
    ) {
      return;
    }

    const prev = overrides[task.id];
    setOverrides((o) => ({ ...o, [task.id]: next }));
    startTx(async () => {
      try {
        await rescheduleTask({
          id: task.id,
          unscheduled: next.unscheduled,
          startDate: next.startDate,
          endDate: next.endDate,
        });
        router.refresh();
      } catch {
        setOverrides((o) => {
          const copy = { ...o };
          if (prev) copy[task.id] = prev;
          else delete copy[task.id];
          return copy;
        });
      }
    });
  }

  function openNew(p: TaskModalPrefill) {
    setEditingTask(null);
    setPrefill(p);
    setTaskOpen(true);
  }

  function openEdit(task: Data["weekTasks"][number]) {
    setPrefill(undefined);
    setEditingTask(task);
    setTaskOpen(true);
  }

  function tasksForDay(iso: string) {
    return weekTasks
      .filter(
        (t) => !t.unscheduled && t.startDate && t.endDate && t.startDate <= iso && t.endDate >= iso,
      )
      .sort(ranaFirst);
  }

  function ranaFirst<T extends { status: string | null }>(a: T, b: T) {
    const ar = a.status === "rana" ? 0 : 1;
    const br = b.status === "rana" ? 0 : 1;
    return ar - br;
  }

  function spanningTasks(week: number) {
    const days = weekWorkdays(data.year.yearNumber, week);
    const wStart = toISODate(days[0]);
    const wEnd = toISODate(days[4]);
    return weekTasks.filter((t) => {
      if (t.unscheduled || !t.startDate || !t.endDate) return false;
      if (t.startDate === t.endDate) return false;
      return t.startDate <= wEnd && t.endDate >= wStart;
    });
  }

  function spanningLayout(week: number) {
    const days = weekWorkdays(data.year.yearNumber, week);
    const dayISOs = days.map((d) => toISODate(d));
    return layoutSpanningTasks(spanningTasks(week), dayISOs);
  }

  function beginSelect(iso: string, week: number) {
    drag.current = { start: iso, end: iso, week };
    setDragRange({ start: iso, end: iso });
  }

  function moveSelect(iso: string) {
    if (!drag.current) return;
    const start = drag.current.start <= iso ? drag.current.start : iso;
    const end = drag.current.start <= iso ? iso : drag.current.start;
    drag.current.end = end;
    setDragRange({ start, end });
  }

  function endSelect() {
    if (!drag.current) return;
    const { start, end } = {
      start: drag.current.start <= drag.current.end ? drag.current.start : drag.current.end,
      end: drag.current.start <= drag.current.end ? drag.current.end : drag.current.start,
    };
    drag.current = null;
    setDragRange(null);
    openNew({ startDate: start, endDate: end, unscheduled: false });
  }

  function goWeek(delta: number) {
    const w = addWeekClamped(data.week, delta);
    router.push(`/?year=${data.year.yearNumber}&week=${w}`);
  }

  function toggleAdjacent(dir: "prev" | "next") {
    const next = adjacent === dir ? null : dir;
    setAdjacent(next);
    const q = next ? `&adj=${next}` : "";
    router.push(`/?year=${data.year.yearNumber}&week=${data.week}${q}`);
  }

  return (
    <div className="page-shell relative">
      <AppNav
        yearNumber={data.year.yearNumber}
        week={data.week}
        theme={data.year.theme}
        yearId={data.year.id}
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-5xl tracking-tight sm:text-6xl">W{data.week}</h1>
          <div className="week-nav-toggle">
            <button type="button" aria-label="Previous week" onClick={() => goWeek(-1)}>
              <ChevronUp size={14} />
            </button>
            <button type="button" aria-label="Next week" onClick={() => goWeek(1)}>
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
        <MetaStack year={meta.year} quarter={meta.quarter} season={meta.season} />
      </div>

      <section className="week-panel">
        <button
          type="button"
          className="week-panel-edge-btn top"
          aria-label="Toggle previous week"
          onClick={() => toggleAdjacent("prev")}
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          className="week-panel-edge-btn bottom"
          aria-label="Toggle next week"
          onClick={() => toggleAdjacent("next")}
        >
          <ChevronDown size={14} />
        </button>

        {weekBlocks.map((block) => (
          <div key={block.week} className="mb-4 last:mb-0">
            {block.week !== data.week ? (
              <p className="mb-2 text-sm text-ink/50">
                W{block.week} — {formatDayHeader(block.days[0])}
              </p>
            ) : null}

            <div className="week-block-grid overflow-x-auto">
              {/* Day headers */}
              {block.days.map((day) => {
                const iso = toISODate(day);
                return (
                  <div key={`h-${iso}`} className="week-day-header">
                    {formatDayHeader(day)}
                  </div>
                );
              })}

              {/* Multi-day band — bars sit over column dividers */}
              {(() => {
                const { items, laneCount } = spanningLayout(block.week);
                if (!laneCount) return null;
                return (
                  <div
                    className="week-multiday-band"
                    style={{
                      gridColumn: "1 / -1",
                      gridTemplateRows: `repeat(${laneCount}, auto)`,
                    }}
                  >
                    {items.map((item) => (
                      <div
                        key={item.task.id}
                        className={clsx(
                          "week-multiday-bar",
                          item.continuesBefore && "continues-before",
                          item.continuesAfter && "continues-after",
                        )}
                        style={{
                          gridColumn: `${item.startCol + 1} / span ${item.span}`,
                          gridRow: item.lane + 1,
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                      >
                        <TaskChip
                          spanning
                          task={item.task}
                          onClick={() => openEdit(item.task)}
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Day columns — single-day chips only */}
              {block.days.map((day) => {
                const iso = toISODate(day);
                const dayTasks = tasksForDay(iso).filter((t) => t.startDate === t.endDate);
                const inDrag =
                  dragRange && iso >= dragRange.start && iso <= dragRange.end;
                return (
                  <div
                    key={iso}
                    className={clsx(
                      "week-day-col",
                      dropTarget === `day:${iso}` && "drop-target-active",
                    )}
                    onMouseEnter={() => {
                      setHoverDay(iso);
                      moveSelect(iso);
                    }}
                    onMouseLeave={() => setHoverDay((h) => (h === iso ? null : h))}
                    onMouseDown={() => beginSelect(iso, block.week)}
                    onMouseUp={endSelect}
                    onDragOver={(e) => {
                      const p = readDrag(e);
                      if (!p || p.source === "member") return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDropTarget(`day:${iso}`);
                    }}
                    onDragLeave={() =>
                      setDropTarget((d) => (d === `day:${iso}` ? null : d))
                    }
                    onDrop={(e) => {
                      e.preventDefault();
                      setDropTarget(null);
                      const p = readDrag(e);
                      if (p) applyDrop(p, { kind: "day", date: iso });
                    }}
                    onTouchStart={() => {
                      longPress.current = window.setTimeout(
                        () => beginSelect(iso, block.week),
                        400,
                      );
                    }}
                    onTouchMove={(e) => {
                      if (!drag.current) return;
                      const el = document.elementFromPoint(
                        e.touches[0].clientX,
                        e.touches[0].clientY,
                      );
                      const dayEl = el?.closest("[data-day]") as HTMLElement | null;
                      if (dayEl?.dataset.day) moveSelect(dayEl.dataset.day);
                    }}
                    onTouchEnd={() => {
                      if (longPress.current) window.clearTimeout(longPress.current);
                      if (drag.current) endSelect();
                    }}
                    data-day={iso}
                  >
                    <div className="week-day-body">
                      {dayTasks.map((t) => (
                        <div
                          key={t.id}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                        >
                          <TaskChip
                            task={t}
                            dragSource="day"
                            onClick={() => openEdit(t)}
                          />
                        </div>
                      ))}
                      {inDrag ? (
                        <div className="border-r-4 border-[#7ec8e3] bg-[#bfe9f7] px-2 py-1.5 text-xs text-ink/70">
                          + Task
                          {dragRange!.start !== dragRange!.end
                            ? `: ${formatMonthDay(dragRange!.start)} – ${formatMonthDay(dragRange!.end)}`
                            : ""}
                        </div>
                      ) : hoverDay === iso && !dragRange ? (
                        <button
                          type="button"
                          className="w-full bg-[#d9f1fa]/80 px-2 py-1.5 text-xs text-ink/60"
                          onClick={(e) => {
                            e.stopPropagation();
                            openNew({ startDate: iso, endDate: iso });
                          }}
                        >
                          + Task
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-light">2 Word Check In / Tasks</h2>
        <div className="checkin-panel">
          {data.members.map((m) => {
            const ci = data.checkIns.find((c) => c.memberId === m.id);
            const memberTasks = weekTasks
              .filter((t) => t.assignees.some((a) => a.id === m.id))
              .sort(ranaFirst);
            const driveOn = !!ci?.driveScreenshot;
            return (
              <div key={m.id} className="checkin-col">
                <div className="relative flex flex-col items-center">
                  <MemberAvatar name={m.name} avatarUrl={m.avatarUrl} size={64} />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={driveOn}
                    title="Drive status screenshot taken"
                    aria-label="Drive status screenshot taken"
                    className={clsx("drive-shot-toggle", driveOn && "is-on")}
                    onClick={() =>
                      startTx(() =>
                        saveCheckIn({
                          yearId: data.year.id,
                          weekNumber: data.week,
                          memberId: m.id,
                          word1: ci?.word1 ?? "",
                          word2: ci?.word2 ?? "",
                          driveScreenshot: !driveOn,
                        }),
                      )
                    }
                  >
                    <span className="drive-shot-knob" aria-hidden />
                  </button>
                  <CheckInWords
                    word1={ci?.word1 ?? ""}
                    word2={ci?.word2 ?? ""}
                    onSave={(word1, word2) =>
                      startTx(() =>
                        saveCheckIn({
                          yearId: data.year.id,
                          weekNumber: data.week,
                          memberId: m.id,
                          word1,
                          word2,
                          driveScreenshot: driveOn,
                        }),
                      )
                    }
                  />
                </div>
                <div
                  className={clsx(
                    "mt-3 min-h-[80px] space-y-1.5 rounded-sm",
                    dropTarget === `member:${m.id}` && "drop-target-active",
                  )}
                  onDragOver={(e) => {
                    const p = readDrag(e);
                    // Only accept from unscheduled (not from day)
                    if (!p || p.source === "day") return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDropTarget(`member:${m.id}`);
                  }}
                  onDragLeave={() =>
                    setDropTarget((d) => (d === `member:${m.id}` ? null : d))
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    setDropTarget(null);
                    const p = readDrag(e);
                    if (p) applyDrop(p, { kind: "member" });
                  }}
                >
                  {memberTasks.map((t) => (
                    <TaskChip
                      key={t.id}
                      task={t}
                      compact
                      dragSource="member"
                      onClick={() => openEdit(t)}
                    />
                  ))}
                  <button
                    type="button"
                    className="w-full px-2 py-2 text-xs text-ink/40 opacity-0 hover:bg-[#d9f1fa]/80 hover:opacity-100"
                    onClick={() =>
                      openNew({
                        startDate: todayISO(),
                        endDate: todayISO(),
                        assigneeIds: [m.id],
                      })
                    }
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                  >
                    + Task
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-light">Unscheduled tasks</h2>
        <div
          className={clsx(
            "grid gap-2 rounded-sm sm:grid-cols-3",
            dropTarget === "unscheduled" && "drop-target-active",
          )}
          onDragOver={(e) => {
            const p = readDrag(e);
            if (!p) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDropTarget("unscheduled");
          }}
          onDragLeave={() =>
            setDropTarget((d) => (d === "unscheduled" ? null : d))
          }
          onDrop={(e) => {
            e.preventDefault();
            setDropTarget(null);
            const p = readDrag(e);
            if (p) applyDrop(p, { kind: "unscheduled" });
          }}
        >
          {unscheduledTasks.map((t) => (
            <TaskChip
              key={t.id}
              task={t}
              dragSource="unscheduled"
              onClick={() => openEdit(t)}
            />
          ))}
          <button
            type="button"
            className="border border-dashed border-black/15 px-3 py-3 text-sm text-ink/40 hover:bg-[#d9f1fa]/50 hover:text-ink/70"
            onClick={() => openNew({ unscheduled: true })}
          >
            + Task
          </button>
        </div>
      </section>

      <footer className="mt-12 flex items-center justify-between border-t border-black/10 pt-4 text-xs text-ink/50">
        <a href="/api/auth/logout" className="underline-offset-2 hover:underline">
          Account / Logout
        </a>
        <span>Team Tasks Manager · v01</span>
      </footer>

      <TaskModal
        open={taskOpen}
        onOpenChange={setTaskOpen}
        yearId={data.year.id}
        goals={data.goals}
        projects={data.projects}
        members={data.members}
        task={editingTask}
        prefill={prefill}
      />
    </div>
  );
}

function CheckInWords({
  word1,
  word2,
  onSave,
}: {
  word1: string;
  word2: string;
  onSave: (a: string, b: string) => void;
}) {
  const [a, setA] = useState(word1);
  const [b, setB] = useState(word2);
  useEffect(() => {
    setA(word1);
    setB(word2);
  }, [word1, word2]);
  return (
    <div className="checkin-words">
      <input
        value={a}
        placeholder="…"
        onChange={(e) => setA(e.target.value)}
        onBlur={() => onSave(a, b)}
      />
      <input
        value={b}
        placeholder="…"
        onChange={(e) => setB(e.target.value)}
        onBlur={() => onSave(a, b)}
      />
    </div>
  );
}