import type { TaskWithRelations } from "@/lib/queries";

export type SpanningLaneItem = {
  task: TaskWithRelations;
  /** 0-based column index within Mon–Fri */
  startCol: number;
  /** number of weekday columns covered */
  span: number;
  /** continues from before this week */
  continuesBefore: boolean;
  /** continues after this week */
  continuesAfter: boolean;
  lane: number;
};

/**
 * Pack multi-day tasks into non-overlapping lanes for a calendar-style band.
 * Longer / earlier tasks take the top lanes.
 */
export function layoutSpanningTasks(
  tasks: TaskWithRelations[],
  dayISOs: string[],
): { items: SpanningLaneItem[]; laneCount: number } {
  const wStart = dayISOs[0];
  const wEnd = dayISOs[dayISOs.length - 1];

  const candidates = tasks
    .filter((t) => {
      if (t.unscheduled || !t.startDate || !t.endDate) return false;
      if (t.startDate === t.endDate) return false;
      return t.startDate <= wEnd && t.endDate >= wStart;
    })
    .map((task) => {
      const idxs = dayISOs
        .map((iso, i) => ({ i, iso }))
        .filter(({ iso }) => task.startDate! <= iso && task.endDate! >= iso);
      const startCol = idxs[0]?.i ?? 0;
      const span = idxs.length || 1;
      return {
        task,
        startCol,
        span,
        continuesBefore: task.startDate! < wStart,
        continuesAfter: task.endDate! > wEnd,
        endCol: startCol + span - 1,
      };
    })
    .sort((a, b) => {
      if (a.startCol !== b.startCol) return a.startCol - b.startCol;
      return b.span - a.span;
    });

  const laneEnds: number[] = []; // last endCol occupied per lane
  const items: SpanningLaneItem[] = [];

  for (const c of candidates) {
    let lane = laneEnds.findIndex((end) => end < c.startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(c.endCol);
    } else {
      laneEnds[lane] = c.endCol;
    }
    items.push({
      task: c.task,
      startCol: c.startCol,
      span: c.span,
      continuesBefore: c.continuesBefore,
      continuesAfter: c.continuesAfter,
      lane,
    });
  }

  return { items, laneCount: laneEnds.length };
}
