# Team Tasks Manager (v01)

Shared weekly planning app for the Historians team.

## Stack

- **Next.js** (App Router) on **Vercel**
- **Postgres** via **Neon** in production (`DATABASE_URL`)
- **PGlite** local fallback when `DATABASE_URL` is unset (dev / cloud agent)
- Shared password gate: user `historian`

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Default local login:

- User: `historian`
- Password: value of `SITE_PASSWORD` (defaults to `historian`)

### Production (Vercel + Neon)

1. Create a Neon database and set `DATABASE_URL`
2. Set `AUTH_SECRET` and `SITE_PASSWORD`
3. Run `npm run db:push` against Neon (or apply the SQL in `src/lib/db/index.ts`)
4. Deploy to Vercel

Password recovery: contact `danielm@brands.mx` (superuser). Logout lives in the week view footer.

## Screens

| Route | Screen |
|-------|--------|
| `/` | 01 Week View (landing) |
| `/goals` | 00 Goals & Settings |
| `/year` | 03 Year View |
| `/year-scroll` | 04 Year in One Page |
| `/login` | Password gate |

## Notes

- Timezone: `America/Monterrey`
- Soft delete + 60s undo toast
- Task counts on Year-in-One-Page are computed from tasks (no denormalized counter)
- Concurrent edits: last write wins
- Avatars: 6 built-in illustrations + upload (data URL for v1)
