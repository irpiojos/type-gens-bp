import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().default("historian"),
  passwordHash: text("password_hash").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const members = pgTable("members", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  avatarType: text("avatar_type").notNull().default("illustration"), // illustration | upload
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const years = pgTable("years", {
  id: uuid("id").defaultRandom().primaryKey(),
  yearNumber: integer("year_number").notNull().unique(),
  theme: text("theme").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const yearMembers = pgTable(
  "year_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    yearId: uuid("year_id")
      .notNull()
      .references(() => years.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("year_member_unique").on(t.yearId, t.memberId)],
);

export const goals = pgTable("goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  yearId: uuid("year_id")
    .notNull()
    .references(() => years.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  letterCode: text("letter_code").notNull(),
  target: text("target"),
  status: text("status").notNull().default("doing"),
  dueLabel: text("due_label"),
  ownerMemberId: uuid("owner_member_id").references(() => members.id),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  goalId: uuid("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const holidays = pgTable("holidays", {
  id: uuid("id").defaultRandom().primaryKey(),
  yearId: uuid("year_id")
    .notNull()
    .references(() => years.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  recurringYearly: boolean("recurring_yearly").notNull().default(false),
  isHalfDay: boolean("is_half_day").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  yearId: uuid("year_id")
    .notNull()
    .references(() => years.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status"),
  goalId: uuid("goal_id").references(() => goals.id),
  projectId: uuid("project_id").references(() => projects.id),
  startDate: date("start_date"),
  endDate: date("end_date"),
  unscheduled: boolean("unscheduled").notNull().default(false),
  doneDate: date("done_date"),
  outputUrl: text("output_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const taskAssignees = pgTable(
  "task_assignees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("task_assignee_unique").on(t.taskId, t.memberId)],
);

export const checkIns = pgTable(
  "check_ins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    yearId: uuid("year_id")
      .notNull()
      .references(() => years.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    word1: text("word1").notNull().default(""),
    word2: text("word2").notNull().default(""),
  },
  (t) => [uniqueIndex("check_in_unique").on(t.yearId, t.weekNumber, t.memberId)],
);

export const datedComments = pgTable("dated_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  yearId: uuid("year_id")
    .notNull()
    .references(() => years.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  color: text("color").notNull().default("#FDE047"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type Member = typeof members.$inferSelect;
export type Year = typeof years.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Holiday = typeof holidays.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type CheckIn = typeof checkIns.$inferSelect;
export type DatedComment = typeof datedComments.$inferSelect;