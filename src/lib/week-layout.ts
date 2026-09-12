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

function isRana(status: string | null | undefined) {
  return status === "rana";
}

/**
 * Pack multi-day tasks into non-overlapping lanes for a calendar-style band.
 * Rana (🐸) tasks always occupy the top lanes; other statuses pack below.
 * Within each group: earlier start, then longer span.
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
    });

  const byGeometry = (
    a: (typeof candidates)[number],
    b: (typeof candidates)[number],
  ) => {
    if (a.startCol !== b.startCol) return a.startCol - b.startCol;
    return b.span - a.span;
  };

  const ranaFirst = [...candidates].filter((c) => isRana(c.task.status)).sort(byGeometry);
  const rest = [...candidates].filter((c) => !isRana(c.task.status)).sort(byGeometry);

  const laneEnds: number[] = [];
  const items: SpanningLaneItem[] = [];

  function pack(list: typeof candidates, laneOffset: number) {
    const localEnds: number[] = [];
    for (const c of list) {
      let local = localEnds.findIndex((end) => end < c.startCol);
      if (local === -1) {
        local = localEnds.length;
        localEnds.push(c.endCol);
      } else {
        localEnds[local] = c.endCol;
      }
      const lane = laneOffset + local;
      while (laneEnds.length <= lane) laneEnds.push(-1);
      laneEnds[lane] = Math.max(laneEnds[lane], c.endCol);
      items.push({
        task: c.task,
        startCol: c.startCol,
        span: c.span,
        continuesBefore: c.continuesBefore,
        continuesAfter: c.continuesAfter,
        lane,
      });
    }
    return localEnds.length;
  }

  const ranaLanes = pack(ranaFirst, 0);
  pack(rest, ranaLanes);

  return { items, laneCount: laneEnds.length };
}
