"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import clsx from "clsx";
import { statusEmoji, statusLabel } from "@/lib/constants";
import type { TaskWithRelations } from "@/lib/queries";
import { formatMonthDay } from "@/lib/dates";

export function TaskChip({
  task,
  onClick,
  compact,
  className,
  style,
  spanning,
}: {
  task: TaskWithRelations;
  onClick?: () => void;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
  spanning?: boolean;
}) {
  const letter = task.goal?.letterCode ?? "?";
  const emoji = statusEmoji(task.status);
  const tip = [
    task.title,
    statusLabel(task.status),
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
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Tooltip.Provider delayDuration={250}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            onClick={onClick}
            style={style}
            className={clsx(
              "task-chip text-left",
              compact && "task-chip-compact",
              spanning && "task-chip-spanning",
              className,
            )}
          >
            <span className="task-chip-prefix">
              {emoji ? <span className="task-chip-emoji">{emoji}</span> : null}
              <span className="task-chip-letter">{letter}</span>
              <span className="task-chip-dash"> – </span>
            </span>
            <span className="task-chip-title">{task.title}</span>
          </button>
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