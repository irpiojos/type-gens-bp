import { eq, isNull, and, sql } from "drizzle-orm";
import { ensureDbReady, getDb, schema } from "@/lib/db";
import { hashPassword } from "@/lib/auth/session";
import { AUTH_USERNAME, ILLUSTRATION_AVATARS, goalLetter } from "@/lib/constants";
import { currentYearNumber } from "@/lib/dates";

export async function bootstrapApp() {
  await ensureDbReady();
  const db = getDb();

  const existingSettings = await db.select().from(schema.settings).limit(1);
  if (existingSettings.length === 0) {
    const password = process.env.SITE_PASSWORD || "historian";
    await db.insert(schema.settings).values({
      username: AUTH_USERNAME,
      passwordHash: await hashPassword(password),
    });
  }

  const yearNum = currentYearNumber();
  const existingYears = await db
    .select()
    .from(schema.years)
    .where(and(eq(schema.years.yearNumber, yearNum), isNull(schema.years.deletedAt)))
    .limit(1);

  if (existingYears.length === 0) {
    const [year] = await db
      .insert(schema.years)
      .values({ yearNumber: yearNum, theme: "" })
      .returning();

    // empty first run — no seed goals/members; year exists so UI works
    void year;
  }

  return true;
}

export async function getActiveYear(yearNumber?: number) {
  await bootstrapApp();
  const db = getDb();
  const yn = yearNumber ?? currentYearNumber();
  const rows = await db
    .select()
    .from(schema.years)
    .where(and(eq(schema.years.yearNumber, yn), isNull(schema.years.deletedAt)))
    .limit(1);
  if (rows[0]) return rows[0];

  // fallback to latest year
  const all = await db
    .select()
    .from(schema.years)
    .where(isNull(schema.years.deletedAt))
    .orderBy(sql`${schema.years.yearNumber} desc`)
    .limit(1);
  return all[0] ?? null;
}

export async function listYears() {
  await bootstrapApp();
  const db = getDb();
  return db
    .select()
    .from(schema.years)
    .where(isNull(schema.years.deletedAt))
    .orderBy(sql`${schema.years.yearNumber} asc`);
}

export { goalLetter, ILLUSTRATION_AVATARS };
