"use client";

import { useMemo, useState, useTransition } from "react";
import { AppNav } from "@/components/layout/app-nav";
import { GoalModal } from "@/components/goals/goal-modal";
import { MemberModal } from "@/components/goals/member-modal";
import { HolidayModal } from "@/components/goals/holiday-modal";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { GOAL_STATUSES } from "@/lib/constants";
import { addYear, updateYearTheme } from "@/lib/actions";
import { formatMonthDay, currentISOWeek } from "@/lib/dates";
import type { getGoalsPageData } from "@/lib/queries";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

type Data = NonNullable<Awaited<ReturnType<typeof getGoalsPageData>>>;

export function GoalsView({ data, week }: { data: Data; week: number }) {
  const router = useRouter();
  const [theme, setTheme] = useState(data.year.theme);
  const [goalOpen, setGoalOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Data["goals"][number] | null>(null);
  const [editingMember, setEditingMember] = useState<Data["members"][number] | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<Data["holidays"][number] | null>(null);
  const [, start] = useTransition();

  const nextYear = data.year.yearNumber + 1;

  const statusMap = useMemo(
    () => Object.fromEntries(GOAL_STATUSES.map((s) => [s.value, s])),
    [],
  );

  return (
    <div className="page-shell relative">
      <AppNav
        yearNumber={data.year.yearNumber}
        week={week || currentISOWeek()}
        theme={theme}
        yearId={data.year.id}
      />

      <h1 className="font-display text-5xl tracking-tight text-ink sm:text-6xl">Goals</h1>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="shrink-0 text-sm text-ink/70">
          {data.year.yearNumber} The Year Of
        </span>
        <input
          className="field flex-1 rounded-full px-4"
          value={theme}
          placeholder="Year theme"
          onChange={(e) => setTheme(e.target.value)}
          onBlur={() => start(() => updateYearTheme(data.year.id, theme))}
        />
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {data.goals.map((g) => {
          const st = statusMap[g.status] ?? GOAL_STATUSES[0];
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                setEditingGoal(g);
                setGoalOpen(true);
              }}
              className="goal-card text-left"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold">{g.name}</h2>
                <span className="flex items-center gap-1 text-sm text-red-600">
                  ◎ <strong>{g.target || "—"}</strong>
                </span>
              </div>
              <ul className="space-y-1.5 text-sm text-ink/80">
                {g.sampleTasks.map((t) => (
                  <li key={t.id} className="truncate">
                    {t.title}
                    {t.startDate ? (
                      <span className="text-[#6aa84f]"> — {formatMonthDay(t.startDate)}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-ink/50 underline-offset-2 hover:underline">
                View All ({g.taskCount})
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {g.dueLabel ? <span className="pill-muted">{g.dueLabel}</span> : null}
                <span className="pill-status">
                  {st.emoji} {st.label}
                </span>
              </div>
            </button>
          );
        })}
      </section>

      <button
        type="button"
        className="mt-4 flex w-full items-center justify-center rounded-2xl border border-dashed border-black/25 bg-white/50 py-8 text-ink/50 hover:bg-white"
        onClick={() => {
          setEditingGoal(null);
          setGoalOpen(true);
        }}
      >
        <Plus size={28} />
      </button>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-medium">Historians Team:</h2>
        <div className="flex gap-5 overflow-x-auto pb-2">
          {data.members.map((m) => (
            <button
              key={m.id}
              type="button"
              className="flex shrink-0 flex-col items-center gap-1"
              onClick={() => {
                setEditingMember(m);
                setMemberOpen(true);
              }}
            >
              <MemberAvatar name={m.name} avatarUrl={m.avatarUrl} size={72} />
              <span className="text-sm underline-offset-2 hover:underline">{m.name}</span>
              {!m.active ? <span className="text-[10px] text-ink/40">inactive</span> : null}
            </button>
          ))}
          <button
            type="button"
            className="flex shrink-0 flex-col items-center gap-1"
            onClick={() => {
              setEditingMember(null);
              setMemberOpen(true);
            }}
          >
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-black/20 bg-white text-2xl">
              +
            </div>
            <span className="text-sm">New</span>
          </button>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Holidays</h2>
          <button
            type="button"
            className="text-sm underline"
            onClick={() => {
              setEditingHoliday(null);
              setHolidayOpen(true);
            }}
          >
            + Add holiday
          </button>
        </div>
        <div className="space-y-2">
          {data.holidays.map((h) => (
            <button
              key={h.id}
              type="button"
              className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-left text-sm hover:bg-black/[0.02]"
              onClick={() => {
                setEditingHoliday(h);
                setHolidayOpen(true);
              }}
            >
              <span className="font-medium">{h.name}</span>
              <span className="text-ink/55">
                {h.startDate}
                {h.endDate !== h.startDate ? ` → ${h.endDate}` : ""}
                {h.isHalfDay ? " · ½ day" : ""}
                {h.recurringYearly ? " · yearly" : ""}
              </span>
            </button>
          ))}
          {!data.holidays.length ? (
            <p className="text-sm text-ink/45">No holidays yet.</p>
          ) : null}
        </div>
      </section>

      <button
        type="button"
        className="mt-10 flex w-full items-center justify-center gap-3 rounded-2xl border border-black/15 bg-white py-6 font-display text-3xl hover:bg-black/[0.02]"
        onClick={() =>
          start(async () => {
            const y = await addYear(data.year.id);
            router.push(`/goals?year=${y.yearNumber}`);
          })
        }
      >
        <Plus size={28} /> {nextYear}
      </button>

      <GoalModal
        open={goalOpen}
        onOpenChange={setGoalOpen}
        yearId={data.year.id}
        goal={editingGoal}
        projects={editingGoal?.projects}
        members={data.members}
      />
      <MemberModal
        open={memberOpen}
        onOpenChange={setMemberOpen}
        yearId={data.year.id}
        member={editingMember}
      />
      <HolidayModal
        open={holidayOpen}
        onOpenChange={setHolidayOpen}
        yearId={data.year.id}
        holiday={editingHoliday}
      />
    </div>
  );
}