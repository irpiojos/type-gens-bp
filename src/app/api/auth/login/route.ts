import { NextResponse } from "next/server";
import { bootstrapApp } from "@/lib/db/bootstrap";
import { getDb, schema, withDbRetry } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth/session";
import { AUTH_USERNAME } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (username !== AUTH_USERNAME) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const rows = await withDbRetry(async () => {
      await bootstrapApp();
      const db = getDb();
      return db.select().from(schema.settings).limit(1);
    });
    const settings = rows[0];
    if (!settings) {
      return NextResponse.json({ error: "App not initialized" }, { status: 500 });
    }

    const ok = await verifyPassword(password, settings.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await createSession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[login]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

export async function DELETE() {
  // logout via cookie clear handled in login?logout=1; keep for completeness
  const { destroySession } = await import("@/lib/auth/session");
  await destroySession();
  return NextResponse.json({ ok: true });
}