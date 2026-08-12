"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { TASK_STATUSES } from "@/lib/constants";
import {
  createProjectInline,
  deleteTask,
  upsertTask,
} from "@/lib/actions";
import { useToast } from "@/components/ui/toast";
import type { Goal, Member, Project, Task } from "@/lib/db/schema";
import clsx from "clsx";
import { formatMonthDay, todayISO } from "@/lib/dates";

export type TaskModalPrefill = {
  startDate?: string | null;
  endDate?: string | null;
  unscheduled?: boolean;
  assigneeIds?: string[];
};

export function TaskModal({
  open,
  onOpenChange,
  yearId,
  goals,
  projects,
  members,
  task,
  prefill,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  yearId: string;
  goals: Goal[];
  projects: Project[];
  members: Member[];
  task?: (Task & { assignees?: Member[] }) | null;
  prefill?: TaskModalPrefill;
}) {
  const { undoableDelete, push } = useToast();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [dateMode, setDateMode] = useState<"one" | "range" | "unscheduled">("one");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [status, setStatus] = useState<string>("");
  const [goalId, setGoalId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [localProjects, setLocalProjects] = useState(projects);
  const [newProjectName, setNewProjectName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  useEffect(() => {
    if (!open) return;
    setError("");
    if (task) {
      setTitle(task.title);
      setStatus(task.status ?? "");
      setGoalId(task.goalId ?? "");
      setProjectId(task.projectId ?? "");
      setAssigneeIds(task.assignees?.map((a) => a.id) ?? []);
      if (task.unscheduled) {
        setDateMode("unscheduled");
        setStartDate(todayISO());
        setEndDate(todayISO());
      } else if (task.startDate && task.endDate && task.startDate !== task.endDate) {
        setDateMode("range");
        setStartDate(task.startDate);
        setEndDate(task.endDate);
      } else {
        setDateMode("one");
        setStartDate(task.startDate || todayISO());
        setEndDate(task.endDate || task.startDate || todayISO());
      }
    } else {
      setTitle("");
      setStatus("");
      setGoalId(goals[0]?.id ?? "");
      setProjectId("");
      setAssigneeIds(prefill?.assigneeIds ?? []);
      if (prefill?.unscheduled) {
        setDateMode("unscheduled");
      } else if (prefill?.startDate && prefill?.endDate && prefill.startDate !== prefill.endDate) {
        setDateMode("range");
        setStartDate(prefill.startDate);
        setEndDate(prefill.endDate);
      } else {
        setDateMode("one");
        setStartDate(prefill?.startDate || todayISO());
        setEndDate(prefill?.endDate || prefill?.startDate || todayISO());
      }
    }
  }, [open, task, prefill, goals]);

  const goalProjects = useMemo(
    () => localProjects.filter((p) => p.goalId === goalId),
    [localProjects, goalId],
  );

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function onSave() {
    setError("");
    start(async () => {
      try {
        await upsertTask({
          id: task?.id,
          yearId,
          title,
          status: status || null,
          goalId: goalId || null,
          projectId: projectId || null,
          unscheduled: dateMode === "unscheduled",
          startDate: dateMode === "unscheduled" ? null : startDate,
          endDate:
            dateMode === "unscheduled"
              ? null
              : dateMode === "one"
                ? startDate
                : endDate,
          assigneeIds,
        });
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  function onDelete() {
    if (!task?.id) return;
    start(async () => {
      await deleteTask(task.id);
      undoableDelete("task", task.id, "Task deleted");
      onOpenChange(false);
    });
  }

  async function addProject() {
    if (!goalId || !newProjectName.trim()) return;
    const p = await createProjectInline(goalId, newProjectName.trim());
    setLocalProjects((prev) => [...prev, p]);
    setProjectId(p.id);
    setNewProjectName("");
    push({ message: "Project created" });
  }

  const datesSummary =
    dateMode === "unscheduled"
      ? "Unscheduled"
      : dateMode === "one"
        ? formatMonthDay(startDate)
        : `${formatMonthDay(startDate)} - ${formatMonthDay(endDate)}`;

  return (
    <Modal open={open} onOpenChange={onOpenChange} className="sm:w-[min(92vw,640px)]">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New Task"
        className="mb-5 w-full rounded-xl border border-black/20 px-4 py-3 text-xl font-light outline-none focus:border-black/40"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-ink/60">Dates</span>
          <select
            className="field"
            value={dateMode}
            onChange={(e) => setDateMode(e.target.value as typeof dateMode)}
          >
            <option value="one">One day — {formatMonthDay(startDate)}</option>
            <option value="range">Range of days</option>
            <option value="unscheduled">Unscheduled</option>
          </select>
          {dateMode !== "unscheduled" && (
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                type="date"
                className="field"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (dateMode === "one") setEndDate(e.target.value);
                }}
              />
              {dateMode === "range" && (
                <input
                  type="date"
                  className="field"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              )}
            </div>
          )}
          <p className="mt-1 text-xs text-ink/45">{datesSummary}</p>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-ink/60">Status</span>
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">N/A</option>
            {TASK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.emoji} {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-ink/60">Part of this Goal:</span>
          <select className="field" value={goalId} onChange={(e) => { setGoalId(e.target.value); setProjectId(""); }}>
            <option value="">—</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-ink/60">Project:</span>
          <select
            className="field"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={!goalId}
          >
            <option value="">N/A</option>
            {goalProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {goalId ? (
            <div className="mt-2 flex gap-2">
              <input
                className="field"
                placeholder="Create new project"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
              <button type="button" className="btn-outline shrink-0" onClick={addProject}>
                Add
              </button>
            </div>
          ) : null}
        </label>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm text-ink/60">Assigned to:</p>
        <div className="flex flex-wrap gap-4">
          {members.map((m) => {
            const selected = assigneeIds.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleAssignee(m.id)}
                className="flex flex-col items-center gap-1"
              >
                <MemberAvatar name={m.name} avatarUrl={m.avatarUrl} selected={selected} size={64} />
                <span className={clsx("text-sm", selected && "underline")}>{m.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        <button type="button" className="btn-outline" disabled={pending} onClick={onSave}>
          Save
        </button>
        {task?.id ? (
          <button
            type="button"
            className="btn-warn"
            disabled={pending}
            onClick={onDelete}
            aria-label="Delete task"
          >
            🗑
          </button>
        ) : null}
      </div>
    </Modal>
  );
}