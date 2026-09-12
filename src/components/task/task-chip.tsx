"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import clsx from "clsx";
import { ExternalLink } from "lucide-react";
import { statusEmoji, statusLabel } from "@/lib/constants";
import type { TaskWithRelations } from "@/lib/queries";
import { formatMonthDay, formatShortMonthDay } from "@/lib/dates";
import { useRef } from "react";

export type TaskDragSource = "day" | "member" | "unscheduled";

export type TaskDragPayload = {
  taskId: string;
  source: TaskDragSource;
};

export function isSingleDayOrUnscheduled(task: {
  unscheduled: boolean;
  startDate: string | null;
  endDate: string | null;
}) {
  if (task.unscheduled) return true;
  return !!(task.startDate && task.endDate && task.startDate === task.endDate);
}

export function TaskChip({
  task,
  onClick,
  compact,
  className,
  style,
  spanning,
  dragSource,
}: {
  task: TaskWithRelations;
  onClick?: () => void;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
  spanning?: boolean;
  /** When set, chip is draggable (single-day / unscheduled only). */
  dragSource?: TaskDragSource;
}) {
  const letter = task.goal?.letterCode ?? "?";
  const emoji = statusEmoji(task.status);
  const doneTip = task.doneDate ? `Done — ${formatShortMonthDay(task.doneDate)}` : null;
  const tip = [
    task.title,
    statusLabel(task.status),
    doneTip,
    task.goal?.name ? `Goal: ${task.goal.name}` : null,
    task.project?.name ? `Project: ${task.project.name}` : null,
    task.assignees?.length
      ? `Assigned: ${task.assignees.map((a) => a.name).join(", ")}`
      : null,
    task.unscheduled
      ? "Unscheduled"
      : task.startDate && task.endDate
        ? task.startDate === task.endDate
          ? formatMonthDay(task.startDate)
          : `${formatMonthDay(task.startDate)} – ${formatMonthDay(task.endDate)}`
        : null,
    task.outputUrl ? `Output: ${task.outputUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const canDrag = !!dragSource && !spanning && isSingleDayOrUnscheduled(task);
  const didDrag = useRef(false);

  function activate() {
    if (didDrag.current) return;
    onClick?.();
  }

  return (
    <Tooltip.Provider delayDuration={250}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {/*
            Native HTML5 drag fails when the gesture starts on a nested <button>.
            Keep a single draggable host that also handles open-on-click.
          */}
          <span
            className={clsx(
              "task-chip-wrap",
              spanning && "task-chip-wrap-spanning",
              canDrag && "task-chip-draggable",
              className,
            )}
            style={style}
            draggable={canDrag}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            title={doneTip ?? undefined}
            onKeyDown={(e) => {
              if (!onClick) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                activate();
              }
            }}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a.task-chip-link")) return;
              activate();
            }}
            onMouseDown={(e) => {
              // Don't let day-range select steal the gesture
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            onDragStart={(e) => {
              if (!canDrag || !dragSource) {
                e.preventDefault();
                return;
              }
              didDrag.current = true;
              const payload: TaskDragPayload = { taskId: task.id, source: dragSource };
              e.dataTransfer.setData("application/x-ttm-task", JSON.stringify(payload));
              e.dataTransfer.setData("text/plain", JSON.stringify(payload));
              e.dataTransfer.effectAllowed = "move";
              e.stopPropagation();
            }}
            onDragEnd={() => {
              window.setTimeout(() => {
                didDrag.current = false;
              }, 0);
            }}
          >
            <span
              className={clsx(
                "task-chip text-left",
                compact && "task-chip-compact",
                spanning && "task-chip-spanning",
              )}
            >
              <span className="task-chip-prefix">
                {emoji ? <span className="task-chip-emoji">{emoji}</span> : null}
                <span className="task-chip-letter">{letter}</span>
                <span className="task-chip-dash"> – </span>
              </span>
              <span className="task-chip-title">{task.title}</span>
            </span>
            {task.outputUrl ? (
              <a
                href={task.outputUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="task-chip-link"
                title="Open output"
                aria-label="Open output URL"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                draggable={false}
              >
                <ExternalLink size={12} strokeWidth={2.25} />
              </a>
            ) : null}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={6}
            className="z-[80] max-w-xs whitespace-pre-line rounded-lg border border-black/10 bg-ink px-3 py-2 text-xs text-white shadow-lg"
          >
            {tip}
            <Tooltip.Arrow className="fill-ink" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
