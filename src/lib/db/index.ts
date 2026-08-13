import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import postgres from "postgres";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";
import { mkdirSync } from "fs";
import { join } from "path";

type Db =
  | ReturnType<typeof drizzlePg<typeof schema>>
  | ReturnType<typeof drizzlePglite<typeof schema>>;

declare global {
  // eslint-disable-next-line no-var
  var __ttmDb: Db | undefined;
  // eslint-disable-next-line no-var
  var __ttmSql: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __ttmPglite: PGlite | undefined;
  // eslint-disable-next-line no-var
  var __ttmDbReady: Promise<void> | undefined;
}

const DDL = `
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL DEFAULT 'historian',
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text,
  avatar_type text NOT NULL DEFAULT 'illustration',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_number integer NOT NULL UNIQUE,
  theme text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS year_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_id uuid NOT NULL REFERENCES years(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS year_member_unique ON year_members(year_id, member_id);
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_id uuid NOT NULL REFERENCES years(id) ON DELETE CASCADE,
  name text NOT NULL,
  letter_code text NOT NULL,
  target text,
  status text NOT NULL DEFAULT 'doing',
  due_label text,
  owner_member_id uuid REFERENCES members(id),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_id uuid NOT NULL REFERENCES years(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  recurring_yearly boolean NOT NULL DEFAULT false,
  is_half_day boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_id uuid NOT NULL REFERENCES years(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text,
  goal_id uuid REFERENCES goals(id),
  project_id uuid REFERENCES projects(id),
  start_date date,
  end_date date,
  unscheduled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS task_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS task_assignee_unique ON task_assignees(task_id, member_id);
CREATE TABLE IF NOT EXISTS check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_id uuid NOT NULL REFERENCES years(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  word1 text NOT NULL DEFAULT '',
  word2 text NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS check_in_unique ON check_ins(year_id, week_number, member_id);
CREATE TABLE IF NOT EXISTS dated_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_id uuid NOT NULL REFERENCES years(id) ON DELETE CASCADE,
  text text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  color text NOT NULL DEFAULT '#FDE047',
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
`;

function createDb(): Db {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    if (!global.__ttmSql) {
      global.__ttmSql = postgres(databaseUrl, {
        prepare: false, // required for Supabase transaction pooler
        max: 1,
      });
    }
    return drizzlePg(global.__ttmSql, { schema });
  }

  const dataDir = join(process.cwd(), ".data");
  mkdirSync(dataDir, { recursive: true });
  const path = join(dataDir, "ttm.pglite");
  if (!global.__ttmPglite) {
    global.__ttmPglite = new PGlite(path);
  }
  return drizzlePglite(global.__ttmPglite, { schema });
}

export function getDb(): Db {
  if (!global.__ttmDb) {
    global.__ttmDb = createDb();
  }
  return global.__ttmDb;
}

export async function ensureDbReady() {
  if (!global.__ttmDbReady) {
    global.__ttmDbReady = (async () => {
      getDb();
      if (!process.env.DATABASE_URL && global.__ttmPglite) {
        await global.__ttmPglite.exec(DDL);
      }
    })();
  }
  await global.__ttmDbReady;
}

export { schema };