# DentBrand AI

Vertical AI SaaS for generating branded social media designs. MVP targets
dental clinics; the architecture supports additional industry verticals.

Built one approved phase at a time — see `docs/PHASES.md` and
`docs/BUILD_LOG.md` for current status (Phase 01 complete).

## Stack

Next.js (App Router, TypeScript strict) · Tailwind CSS · shadcn/ui ·
React Hook Form + Zod · Supabase (Auth, PostgreSQL, Storage, RLS) ·
React Konva + Zustand (later phases) · Gemini (later phases) · Paddle
(later phases).

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project values
# apply supabase/migrations/*.sql to your Supabase project
npm run dev
```

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

RLS tests: `supabase/tests/phase01_rls_tests.sql` (see `docs/TESTING.md`).
