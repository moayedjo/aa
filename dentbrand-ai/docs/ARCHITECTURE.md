# DentBrand AI — Architecture

## High-level

Next.js App Router application (in `dentbrand-ai/` inside this repo) backed
entirely by Supabase (Auth, PostgreSQL, Storage). All private customer data
belongs to a **Workspace**; Row Level Security is the authoritative access
control layer. Server Actions carry mutations; business logic lives in
`src/lib/`, not in React components.

## Multi-workspace model

- Every private resource references a `workspace_id` (from Phase 02 onward).
- A user must never read or modify data of a workspace they don't belong to.
- Enforced in the database by RLS, not by application code alone.

## Roles

- **Platform roles** (`user_roles` table): `platform_admin`, `user`.
  Platform-admin status is never derived from profile fields or
  client-controlled metadata — only from the server-managed `user_roles`
  table, changed exclusively via the service role.
- **Workspace roles** (`workspace_members.role`): `owner`, `admin`,
  `editor`, `viewer`.

## Auth flow (Phase 01)

1. `src/proxy.ts` (Next 16 proxy, formerly middleware) runs on every
   request: refreshes the Supabase session cookie via
   `src/lib/supabase/proxy.ts` and applies optimistic redirects
   (unauthenticated → `/login`, authenticated → away from auth pages).
2. Server layouts/pages re-check `supabase.auth.getUser()` — the proxy is
   an optimization, not the security boundary.
3. RLS is the final boundary: even a bypassed route cannot read foreign data.

## Supabase clients

| File | Runs | Key | Purpose |
|---|---|---|---|
| `src/lib/supabase/client.ts` | browser | anon | client components |
| `src/lib/supabase/server.ts` | server | anon + user cookies | RSC / actions |
| `src/lib/supabase/proxy.ts` | proxy | anon + user cookies | session refresh |
| `src/lib/supabase/admin.ts` | server only | service role | future audited privileged tasks; guarded by `import "server-only"` |

## Directory layout (current)

```
dentbrand-ai/
├── src/
│   ├── app/            # routes: (auth)/, dashboard/, auth/callback, api/health
│   ├── components/     # ui/ (shadcn-style), auth/, workspaces/
│   ├── lib/            # supabase/, auth/, workspaces/, validation/, utils.ts
│   ├── types/          # database row types
│   └── proxy.ts        # Next 16 proxy (middleware)
├── supabase/
│   ├── migrations/     # versioned SQL, never edited after apply
│   └── tests/          # documented RLS test SQL
└── docs/
```

Future folders (stores/, lib/ai/, lib/credits/, …) are created only in the
phase that needs them.

## Vertical-ready rules

- No `dental_` prefixes on reusable tables.
- Industry services/prompts will live in database-backed structures
  (Phase 03+); templates and prompt templates reference an
  `industry_vertical`.
- The UI may expose only the dental vertical during MVP.

## Notable framework facts

- Next.js 16: `middleware.ts` is renamed `proxy.ts` with an exported
  `proxy` function; `cookies()`/`params` are async.
- Tailwind CSS v4 (CSS-first config in `globals.css`, no tailwind.config).
- shadcn/ui components are vendored manually under `src/components/ui/`
  (registry unreachable from the build environment — see DECISIONS.md).
