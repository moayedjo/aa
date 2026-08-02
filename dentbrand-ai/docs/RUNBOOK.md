# DentBrand AI — Operations Runbook

Operational procedures for the beta. Owner: platform admin.

## Backup procedure

**Database (Supabase Postgres)**

- Supabase takes automated daily backups on paid plans; confirm the plan
  and retention in the Supabase dashboard before beta.
- Weekly manual logical backup (belt-and-suspenders):
  `supabase db dump --db-url "$SUPABASE_DB_URL" -f backups/db-YYYY-MM-DD.sql`
  stored off-platform (encrypted bucket / password manager vault).
- Before any migration on production: take an on-demand backup first.
- Migrations are versioned and append-only (`supabase/migrations/`); never
  edit an applied migration — roll forward with a new one.

**Storage (buckets `brand-assets`, `design-assets`)**

- Private buckets; contents are re-creatable (logos re-uploadable, AI
  images regenerable) but back up monthly via `supabase storage` export for
  paying customers' brand assets.

**Restore drill**

- Quarterly: restore the latest dump into a scratch Supabase project, run
  `supabase/tests/*.sql`, and confirm the app boots against it. Record the
  restore time.

## Incident procedure

**Severity**

- SEV1: data leakage, auth bypass, billing charging errors, full outage.
- SEV2: a core flow broken for many users (export, AI, save).
- SEV3: degraded/non-blocking issue.

**Steps**

1. **Acknowledge** — note start time; assign an incident lead.
2. **Assess** — check `/admin` KPIs (export success rate, AI failures),
   the AI-usage view, Sentry (if `SENTRY_DSN` set), and Supabase logs.
3. **Contain** — for a suspected leak, rotate keys immediately:
   `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `PADDLE_API_KEY`,
   `PADDLE_WEBHOOK_SECRET`; revoke sessions if auth is implicated.
4. **Communicate** — status note to affected users for SEV1/2.
5. **Fix** — patch on a branch, run lint/typecheck/test/build, deploy.
6. **Verify** — confirm KPIs recover; watch for recurrence.
7. **Post-mortem** — within 48h for SEV1/2: timeline, root cause, action
   items. Credit adjustments for affected users go through the audited
   `/admin/workspaces/[id]` credit-adjust flow.

**Key rotation**

- All secrets are server-side env vars (see `.env.example`). Rotating a key
  is an env change + redeploy; no code change. The service-role key is used
  only in `src/lib/supabase/admin.ts`.

## On-call quick links

- Admin overview: `/admin` · AI usage: `/admin/ai` · Audit log: `/admin/audit`
- Health: `/api/health`
- Webhook endpoint: `/api/webhooks/paddle` (Paddle → our source of truth)
