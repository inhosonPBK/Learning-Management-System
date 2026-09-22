# Training Hub — Learning Management System

Promega Korea · Promega Biosystems Korea 사내 통합 교육훈련 플랫폼 (인턴 · 신입 · 경력 OJT).

**Stack**: Next.js 16 (App Router) · TypeScript · Tailwind v4 + shadcn/ui (Base UI) · Supabase (Postgres / Auth / Storage) · next-intl (KO/EN) · Vercel

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys + SUPABASE_DB_URL
npm run migrate              # apply supabase/migrations/*.sql
npm run seed -- "../01. PBK_PK_org_users_seed/PBK_org_users_seed.xlsx" --dry-run
npm run seed -- "../01. PBK_PK_org_users_seed/PBK_org_users_seed.xlsx"
npm run dev
```

| Script | Purpose |
|---|---|
| `npm run migrate` | Apply pending SQL migrations (tracked in `public.schema_migrations`). `-- --status` to list. |
| `npm run seed -- <xlsx>` | Upsert departments / teams / profiles, create auth users with temp passwords → `out/seed-output-*.csv` (gitignored). Flags: `--dry-run`, `--only=email`, `--reset-passwords`. |
| `npm run typecheck` | `tsc --noEmit` |

## Architecture notes

- **Auth**: Supabase email/password only. Pre-registered users, temp password, forced change on first login (`profiles.must_change_password`). No SSO by design.
- **Authorization**: 100% application-level. Every table has RLS enabled with no policies; all reads/writes go through the service-role client (`lib/supabase/admin.ts`) and are gated by `lib/auth/viewer.ts` (`requireViewer`) + `lib/auth/permissions.ts` (`canViewReport`, …). `proxy.ts` only refreshes the session and enforces the login boundary.
- **Org model**: `profiles.manager_id` (org chart) · `profiles.team_code` (10 owner-defined teams, derived from the Level-1 lead) · `enrollments.mentor_id` (per-program mentor). Report visibility = trainee · author · mentor · direct manager (`MANAGER_SCOPE`) · watchers · People Ops · GM · admin.
- **Reports**: single `reports` table, `report_type` discriminator, `content jsonb` + `schema_version`; zod-validated per type in server actions.
- **i18n**: cookie-based locale (`NEXT_LOCALE`), messages in `messages/{ko,en}.json`. Print sheets are Korean-only (government form).
