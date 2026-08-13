"use server";

import { and, eq, isNull, sql, inArray, or, gte, lte, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema, ensureDbReady } from "@/lib/db";
import { bootstrapApp, getActiveYear } from "@/lib/db/bootstrap";
import { requireSession, verifyPassword, hashPassword } from "@/lib/auth/session";
import { goalLetter } from "@/lib/constants";
import { todayISO } from "@/lib/dates";

async function dbReady() {
  await requireSession();
  await bootstrapApp();
  return getDb();
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

/* ---------------- Years ---------------- */

export async function updateYearTheme(yearId: string, theme: string) {
  const db = await dbReady();
  await db
    .update(schema.years)
    .set({ theme })
    .where(eq(schema.years.id, yearId));
  revalidateAll();
}

export async function addYear(
  fromYearId: string,
): Promise<{ ok: true; year: typeof schema.years.$inferSelect } | { ok: false; error: string }> {
  try {
    const db = await dbReady();
    const [from] = await db
      .select()
      .from(schema.years)
      .where(eq(schema.years.id, fromYearId))
      .limit(1);
    if (!from) return { ok: false, error: "Year not found" };

    const nextNum = from.yearNumber + 1;
    const existing = await db
      .select()
      .from(schema.years)
      .where(eq(schema.years.yearNumber, nextNum))
      .limit(1);

    let year = existing[0];
    if (year?.deletedAt) {
      const [restored] = await db
        .update(schema.years)
        .set({ deletedAt: null, theme: year.theme || "" })
        .where(eq(schema.years.id, year.id))
        .returning();
      year = restored;
    } else if (!year) {
      const [created] = await db
        .insert(schema.years)
        .values({ yearNumber: nextNum, theme: "" })
        .returning();
      year = created;
    }

    // ensure members from previous year (or all active) are linked
    const prevMembers = await db
      .select()
      .from(schema.yearMembers)
      .where(eq(schema.yearMembers.yearId, fromYearId));

    let memberIds = prevMembers.map((m) => m.memberId);
    if (memberIds.length === 0) {
      const active = await db
        .select()
        .from(schema.members)
        .where(and(eq(schema.members.active, true), isNull(schema.members.deletedAt)));
      memberIds = active.map((m) => m.id);
    }

    for (const memberId of memberIds) {
      const link = await db
        .select()
        .from(schema.yearMembers)
        .where(
          and(
            eq(schema.yearMembers.yearId, year.id),
            eq(schema.yearMembers.memberId, memberId),
          ),
        )
        .limit(1);
      if (!link.length) {
        await db.insert(schema.yearMembers).values({ yearId: year.id, memberId });
      }
    }

    revalidateAll();
    return { ok: true, year };
  } catch {
    return { ok: false, error: "Could not add year" };
  }
}

/* ---------------- Members ---------------- */

export async function upsertMember(input: {
  id?: string;
  name: string;
  avatarUrl?: string | null;
  avatarType?: "illustration" | "upload";
  active?: boolean;
  yearId?: string;
}) {
  const db = await dbReady();
  if (input.id) {
    await db
      .update(schema.members)
      .set({
        name: input.name,
        avatarUrl: input.avatarUrl ?? null,
        avatarType: input.avatarType ?? "illustration",
        active: input.active ?? true,
      })
      .where(eq(schema.members.id, input.id));
    revalidateAll();
    return input.id;
  }

  const [m] = await db
    .insert(schema.members)
    .values({
      name: input.name,
      avatarUrl: input.avatarUrl ?? null,
      avatarType: input.avatarType ?? "illustration",
      active: input.active ?? true,
    })
    .returning();

  if (input.yearId) {
    const existingLink = await db
      .select()
      .from(schema.yearMembers)
      .where(
        and(
          eq(schema.yearMembers.yearId, input.yearId),
          eq(schema.yearMembers.memberId, m.id),
        ),
      )
      .limit(1);
    if (!existingLink.length) {
      await db.insert(schema.yearMembers).values({ yearId: input.yearId, memberId: m.id });
    }
  }
  revalidateAll();
  return m.id;
}

export async function deleteMember(id: string) {
  const db = await dbReady();
  const refs = await db
    .select()
    .from(schema.taskAssignees)
    .where(eq(schema.taskAssignees.memberId, id))
    .limit(1);
  if (refs.length) {
    return { ok: false as const, reason: "referenced" as const };
  }
  await db
    .update(schema.members)
    .set({ deletedAt: new Date(), active: false })
    .where(eq(schema.members.id, id));
  revalidateAll();
  return { ok: true as const };
}

export async function restoreMember(id: string) {
  const db = await dbReady();
  await db
    .update(schema.members)
    .set({ deletedAt: null, active: true })
    .where(eq(schema.members.id, id));
  revalidateAll();
}

/* ---------------- Goals ---------------- */

export async function upsertGoal(input: {
  id?: string;
  yearId: string;
  name: string;
  target?: string | null;
  status?: string;
  dueLabel?: string | null;
  ownerMemberId?: string | null;
  projects?: { id?: string; name: string; delete?: boolean }[];
}) {
  const db = await dbReady();
  const letter = goalLetter(input.name);

  let goalId = input.id;
  if (goalId) {
    await db
      .update(schema.goals)
      .set({
        name: input.name,
        letterCode: letter,
        target: input.target ?? null,
        status: input.status ?? "doing",
        dueLabel: input.dueLabel ?? null,
        ownerMemberId: input.ownerMemberId ?? null,
      })
      .where(eq(schema.goals.id, goalId));
  } else {
    const count = await db
      .select({ c: sql<number>`count(*)` })
      .from(schema.goals)
      .where(and(eq(schema.goals.yearId, input.yearId), isNull(schema.goals.deletedAt)));
    const [g] = await db
      .insert(schema.goals)
      .values({
        yearId: input.yearId,
        name: input.name,
        letterCode: letter,
        target: input.target ?? null,
        status: input.status ?? "doing",
        dueLabel: input.dueLabel ?? null,
        ownerMemberId: input.ownerMemberId ?? null,
        sortOrder: Number(count[0]?.c ?? 0),
      })
      .returning();
    goalId = g.id;
  }

  if (input.projects) {
    for (const p of input.projects) {
      if (p.delete && p.id) {
        const taskRef = await db
          .select()
          .from(schema.tasks)
          .where(and(eq(schema.tasks.projectId, p.id), isNull(schema.tasks.deletedAt)))
          .limit(1);
        if (taskRef.length) continue;
        await db
          .update(schema.projects)
          .set({ deletedAt: new Date() })
          .where(eq(schema.projects.id, p.id));
      } else if (p.id) {
        await db
          .update(schema.projects)
          .set({ name: p.name })
          .where(eq(schema.projects.id, p.id));
      } else if (p.name.trim()) {
        await db.insert(schema.projects).values({ goalId: goalId!, name: p.name.trim() });
      }
    }
  }

  revalidateAll();
  return goalId!;
}

export async function deleteGoal(id: string) {
  const db = await dbReady();
  const refs = await db
    .select()
    .from(schema.tasks)
    .where(and(eq(schema.tasks.goalId, id), isNull(schema.tasks.deletedAt)))
    .limit(1);
  if (refs.length) {
    return { ok: false as const, reason: "referenced" as const };
  }
  await db
    .update(schema.goals)
    .set({ deletedAt: new Date() })
    .where(eq(schema.goals.id, id));
  revalidateAll();
  return { ok: true as const };
}

export async function restoreGoal(id: string) {
  const db = await dbReady();
  await db.update(schema.goals).set({ deletedAt: null }).where(eq(schema.goals.id, id));
  revalidateAll();
}

/* ---------------- Holidays ---------------- */

export async function upsertHoliday(input: {
  id?: string;
  yearId: string;
  name: string;
  startDate: string;
  endDate: string;
  recurringYearly?: boolean;
  isHalfDay?: boolean;
}) {
  const db = await dbReady();
  if (input.id) {
    await db
      .update(schema.holidays)
      .set({
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        recurringYearly: input.recurringYearly ?? false,
        isHalfDay: input.isHalfDay ?? false,
      })
      .where(eq(schema.holidays.id, input.id));
    revalidateAll();
    return input.id;
  }
  const [h] = await db
    .insert(schema.holidays)
    .values({
      yearId: input.yearId,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      recurringYearly: input.recurringYearly ?? false,
      isHalfDay: input.isHalfDay ?? false,
    })
    .returning();
  revalidateAll();
  return h.id;
}

export async function deleteHoliday(id: string) {
  const db = await dbReady();
  await db
    .update(schema.holidays)
    .set({ deletedAt: new Date() })
    .where(eq(schema.holidays.id, id));
  revalidateAll();
  return { ok: true as const };
}

export async function restoreHoliday(id: string) {
  const db = await dbReady();
  await db.update(schema.holidays).set({ deletedAt: null }).where(eq(schema.holidays.id, id));
  revalidateAll();
}

/* ---------------- Tasks ---------------- */

export async function upsertTask(input: {
  id?: string;
  yearId: string;
  title: string;
  status?: string | null;
  goalId?: string | null;
  projectId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  unscheduled?: boolean;
  assigneeIds: string[];
}) {
  const db = await dbReady();
  if (!input.title.trim()) throw new Error("Title required");
  if (!input.unscheduled && (!input.startDate || !input.endDate)) {
    throw new Error("Dates required");
  }

  let taskId = input.id;
  const payload = {
    yearId: input.yearId,
    title: input.title.trim(),
    status: input.status || null,
    goalId: input.goalId || null,
    projectId: input.projectId || null,
    startDate: input.unscheduled ? null : input.startDate || null,
    endDate: input.unscheduled ? null : input.endDate || null,
    unscheduled: !!input.unscheduled,
    updatedAt: new Date(),
  };

  if (taskId) {
    await db.update(schema.tasks).set(payload).where(eq(schema.tasks.id, taskId));
    await db.delete(schema.taskAssignees).where(eq(schema.taskAssignees.taskId, taskId));
  } else {
    const [t] = await db.insert(schema.tasks).values(payload).returning();
    taskId = t.id;
  }

  if (input.assigneeIds.length) {
    await db.insert(schema.taskAssignees).values(
      input.assigneeIds.map((memberId) => ({ taskId: taskId!, memberId })),
    );
  }

  revalidateAll();
  return taskId!;
}

export async function deleteTask(id: string) {
  const db = await dbReady();
  await db
    .update(schema.tasks)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.tasks.id, id));
  revalidateAll();
  return { ok: true as const };
}

export async function restoreTask(id: string) {
  const db = await dbReady();
  await db
    .update(schema.tasks)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(schema.tasks.id, id));
  revalidateAll();
}

export async function createProjectInline(goalId: string, name: string) {
  const db = await dbReady();
  const [p] = await db
    .insert(schema.projects)
    .values({ goalId, name: name.trim() })
    .returning();
  revalidateAll();
  return p;
}

/* ---------------- Check-ins ---------------- */

export async function saveCheckIn(input: {
  yearId: string;
  weekNumber: number;
  memberId: string;
  word1: string;
  word2: string;
}) {
  const db = await dbReady();
  const existing = await db
    .select()
    .from(schema.checkIns)
    .where(
      and(
        eq(schema.checkIns.yearId, input.yearId),
        eq(schema.checkIns.weekNumber, input.weekNumber),
        eq(schema.checkIns.memberId, input.memberId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(schema.checkIns)
      .set({ word1: input.word1, word2: input.word2 })
      .where(eq(schema.checkIns.id, existing[0].id));
  } else {
    await db.insert(schema.checkIns).values(input);
  }
  revalidateAll();
}

/* ---------------- Dated comments ---------------- */

export async function upsertDatedComment(input: {
  id?: string;
  yearId: string;
  text: string;
  startDate: string;
  endDate: string;
  color: string;
}) {
  const db = await dbReady();
  if (input.id) {
    await db
      .update(schema.datedComments)
      .set({
        text: input.text,
        startDate: input.startDate,
        endDate: input.endDate,
        color: input.color,
      })
      .where(eq(schema.datedComments.id, input.id));
    revalidateAll();
    return input.id;
  }
  const [c] = await db
    .insert(schema.datedComments)
    .values({
      yearId: input.yearId,
      text: input.text,
      startDate: input.startDate,
      endDate: input.endDate,
      color: input.color,
    })
    .returning();
  revalidateAll();
  return c.id;
}

export async function deleteDatedComment(id: string) {
  const db = await dbReady();
  await db
    .update(schema.datedComments)
    .set({ deletedAt: new Date() })
    .where(eq(schema.datedComments.id, id));
  revalidateAll();
  return { ok: true as const };
}

export async function restoreDatedComment(id: string) {
  const db = await dbReady();
  await db
    .update(schema.datedComments)
    .set({ deletedAt: null })
    .where(eq(schema.datedComments.id, id));
  revalidateAll();
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const db = await dbReady();
    if (!newPassword || newPassword.length < 6) {
      return { ok: false, error: "New password must be at least 6 characters" };
    }
    const rows = await db.select().from(schema.settings).limit(1);
    const settings = rows[0];
    if (!settings) return { ok: false, error: "Settings not found" };
    const ok = await verifyPassword(currentPassword, settings.passwordHash);
    if (!ok) return { ok: false, error: "Current password is incorrect" };
    await db
      .update(schema.settings)
      .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
      .where(eq(schema.settings.id, settings.id));
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not update password" };
  }
}

export async function softDeleteEntity(
  kind: "task" | "goal" | "member" | "holiday" | "comment",
  id: string,
) {
  if (kind === "task") return deleteTask(id);
  if (kind === "goal") return deleteGoal(id);
  if (kind === "member") return deleteMember(id);
  if (kind === "holiday") return deleteHoliday(id);
  return deleteDatedComment(id);
}

export async function restoreEntity(
  kind: "task" | "goal" | "member" | "holiday" | "comment",
  id: string,
) {
  if (kind === "task") return restoreTask(id);
  if (kind === "goal") return restoreGoal(id);
  if (kind === "member") return restoreMember(id);
  if (kind === "holiday") return restoreHoliday(id);
  return restoreDatedComment(id);
}

export { todayISO, getActiveYear, ensureDbReady };