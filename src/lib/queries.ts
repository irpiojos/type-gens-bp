import { and, eq, isNull, sql, inArray, asc } from "drizzle-orm";
import { getDb, schema, withDbRetry } from "@/lib/db";
import { bootstrapApp, getActiveYear } from "@/lib/db/bootstrap";
import { taskTouchesWeek, toISODate } from "@/lib/dates";

export type TaskWithRelations = typeof schema.tasks.$inferSelect & {
  assignees: (typeof schema.members.$inferSelect)[];
  goal: typeof schema.goals.$inferSelect | null;
  project: typeof schema.projects.$inferSelect | null;
};

async function loadTaskRelations(
  tasks: (typeof schema.tasks.$inferSelect)[],
): Promise<TaskWithRelations[]> {
  if (!tasks.length) return [];
  const db = getDb();
  const ids = tasks.map((t) => t.id);
  const assigneeRows = await db
    .select({
      taskId: schema.taskAssignees.taskId,
      member: schema.members,
    })
    .from(schema.taskAssignees)
    .innerJoin(schema.members, eq(schema.taskAssignees.memberId, schema.members.id))
    .where(inArray(schema.taskAssignees.taskId, ids));

  const goalIds = [...new Set(tasks.map((t) => t.goalId).filter(Boolean))] as string[];
  const projectIds = [...new Set(tasks.map((t) => t.projectId).filter(Boolean))] as string[];

  const goals = goalIds.length
    ? await db.select().from(schema.goals).where(inArray(schema.goals.id, goalIds))
    : [];
  const projects = projectIds.length
    ? await db.select().from(schema.projects).where(inArray(schema.projects.id, projectIds))
    : [];

  return tasks.map((t) => ({
    ...t,
    assignees: assigneeRows.filter((a) => a.taskId === t.id).map((a) => a.member),
    goal: goals.find((g) => g.id === t.goalId) ?? null,
    project: projects.find((p) => p.id === t.projectId) ?? null,
  }));
}

export async function getGoalsPageData(yearNumber?: number) {
  return withDbRetry(async () => {
    await bootstrapApp();
    const year = await getActiveYear(yearNumber);
    if (!year) return null;
    const db = getDb();

    const goals = await db
      .select()
      .from(schema.goals)
      .where(and(eq(schema.goals.yearId, year.id), isNull(schema.goals.deletedAt)))
      .orderBy(asc(schema.goals.sortOrder));

    const goalIds = goals.map((g) => g.id);
    const projects = goalIds.length
      ? await db
          .select()
          .from(schema.projects)
          .where(and(inArray(schema.projects.goalId, goalIds), isNull(schema.projects.deletedAt)))
      : [];

    const tasks = goalIds.length
      ? await db
          .select()
          .from(schema.tasks)
          .where(and(inArray(schema.tasks.goalId, goalIds), isNull(schema.tasks.deletedAt)))
      : [];

    const ym = await db
      .select({ member: schema.members })
      .from(schema.yearMembers)
      .innerJoin(schema.members, eq(schema.yearMembers.memberId, schema.members.id))
      .where(
        and(
          eq(schema.yearMembers.yearId, year.id),
          isNull(schema.members.deletedAt),
        ),
      );

    let members = ym.map((r) => r.member);
    if (!members.length) {
      members = await db
        .select()
        .from(schema.members)
        .where(and(eq(schema.members.active, true), isNull(schema.members.deletedAt)));
    }

    const holidays = await db
      .select()
      .from(schema.holidays)
      .where(and(eq(schema.holidays.yearId, year.id), isNull(schema.holidays.deletedAt)))
      .orderBy(asc(schema.holidays.startDate));

    const goalsEnriched = goals.map((g) => {
      const goalTasks = tasks.filter((t) => t.goalId === g.id);
      const sample = goalTasks
        .filter((t) => t.startDate)
        .sort((a, b) => (a.startDate! > b.startDate! ? 1 : -1))
        .slice(0, 5);
      return {
        ...g,
        projects: projects.filter((p) => p.goalId === g.id),
        taskCount: goalTasks.length,
        sampleTasks: sample,
      };
    });

    const years = await db
      .select()
      .from(schema.years)
      .where(isNull(schema.years.deletedAt))
      .orderBy(asc(schema.years.yearNumber));

    return { year, goals: goalsEnriched, members, holidays, years };
  });
}

export async function getWeekPageData(yearNumber: number, week: number, adjacent: "prev" | "next" | null) {
  return withDbRetry(async () => {
    await bootstrapApp();
    const year = await getActiveYear(yearNumber);
    if (!year) return null;
    const db = getDb();

    const weeks = [week];
    if (adjacent === "prev" && week > 1) weeks.unshift(week - 1);
    if (adjacent === "next" && week < 53) weeks.push(week + 1);

    const allTasks = await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.yearId, year.id), isNull(schema.tasks.deletedAt)));

    const withRel = await loadTaskRelations(allTasks);

    const weekTasks = withRel.filter((t) =>
      weeks.some((w) => taskTouchesWeek(t.startDate, t.endDate, t.unscheduled, year.yearNumber, w)),
    );
    const unscheduled = withRel.filter((t) => t.unscheduled);

    const ym = await db
      .select({ member: schema.members })
      .from(schema.yearMembers)
      .innerJoin(schema.members, eq(schema.yearMembers.memberId, schema.members.id))
      .where(
        and(eq(schema.yearMembers.yearId, year.id), isNull(schema.members.deletedAt), eq(schema.members.active, true)),
      );

    let members = ym.map((r) => r.member);
    if (!members.length) {
      members = await db
        .select()
        .from(schema.members)
        .where(and(eq(schema.members.active, true), isNull(schema.members.deletedAt)));
    }

    const checkIns = await db
      .select()
      .from(schema.checkIns)
      .where(and(eq(schema.checkIns.yearId, year.id), eq(schema.checkIns.weekNumber, week)));

    const goals = await db
      .select()
      .from(schema.goals)
      .where(and(eq(schema.goals.yearId, year.id), isNull(schema.goals.deletedAt)))
      .orderBy(asc(schema.goals.sortOrder));

    const projects = goals.length
      ? await db
          .select()
          .from(schema.projects)
          .where(
            and(
              inArray(
                schema.projects.goalId,
                goals.map((g) => g.id),
              ),
              isNull(schema.projects.deletedAt),
            ),
          )
      : [];

    return {
      year,
      week,
      weeks,
      adjacent,
      weekTasks,
      unscheduled,
      members,
      checkIns,
      goals,
      projects,
      allTasks: withRel,
    };
  });
}

export async function getYearListData(yearNumber: number) {
  return withDbRetry(async () => {
    await bootstrapApp();
    const year = await getActiveYear(yearNumber);
    if (!year) return null;
    const db = getDb();
    const allTasks = await db
      .select()
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.yearId, year.id),
          isNull(schema.tasks.deletedAt),
          eq(schema.tasks.unscheduled, false),
        ),
      );
    const withRel = await loadTaskRelations(allTasks);
    const goals = await db
      .select()
      .from(schema.goals)
      .where(and(eq(schema.goals.yearId, year.id), isNull(schema.goals.deletedAt)));
    return { year, tasks: withRel, goals };
  });
}

export async function getYearScrollData(yearNumber: number) {
  return withDbRetry(async () => {
    await bootstrapApp();
    const year = await getActiveYear(yearNumber);
    if (!year) return null;
    const db = getDb();

    const tasks = await db
      .select()
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.yearId, year.id),
          isNull(schema.tasks.deletedAt),
          eq(schema.tasks.unscheduled, false),
        ),
      );

    const holidays = await db
      .select()
      .from(schema.holidays)
      .where(and(eq(schema.holidays.yearId, year.id), isNull(schema.holidays.deletedAt)));

    const comments = await db
      .select()
      .from(schema.datedComments)
      .where(and(eq(schema.datedComments.yearId, year.id), isNull(schema.datedComments.deletedAt)));

    // task counts by date
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      if (!t.startDate || !t.endDate) continue;
      let d = t.startDate;
      while (d <= t.endDate) {
        // only count weekdays for density? count all days in range for the cell
        counts[d] = (counts[d] ?? 0) + 1;
        const next = new Date(d + "T12:00:00");
        next.setDate(next.getDate() + 1);
        d = toISODate(next);
      }
    }

    return { year, counts, holidays, comments, tasks };
  });
}

export async function getTaskModalOptions(yearId: string) {
  return withDbRetry(async () => {
    await bootstrapApp();
    const db = getDb();
    const goals = await db
      .select()
      .from(schema.goals)
      .where(and(eq(schema.goals.yearId, yearId), isNull(schema.goals.deletedAt)))
      .orderBy(asc(schema.goals.sortOrder));
    const projects = goals.length
      ? await db
          .select()
          .from(schema.projects)
          .where(
            and(
              inArray(
                schema.projects.goalId,
                goals.map((g) => g.id),
              ),
              isNull(schema.projects.deletedAt),
            ),
          )
      : [];
    const ym = await db
      .select({ member: schema.members })
      .from(schema.yearMembers)
      .innerJoin(schema.members, eq(schema.yearMembers.memberId, schema.members.id))
      .where(and(eq(schema.yearMembers.yearId, yearId), isNull(schema.members.deletedAt)));
    let members = ym.map((r) => r.member).filter((m) => m.active);
    if (!members.length) {
      members = await db
        .select()
        .from(schema.members)
        .where(and(eq(schema.members.active, true), isNull(schema.members.deletedAt)));
    }
    return { goals, projects, members };
  });
}