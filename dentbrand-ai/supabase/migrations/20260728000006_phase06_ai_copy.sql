-- =============================================================================
-- Phase 06 — AI Copy
-- Tables: prompt_templates, prompt_versions (immutable), ai_generations.
-- Prompts are platform IP: RLS exposes them to platform admins only; the
-- generation server action reads them via the audited service-role client.
-- =============================================================================

create table public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  vertical_id uuid not null references public.industry_verticals (id) on delete cascade,
  key text not null check (char_length(key) between 2 and 60),
  kind text not null default 'copy' check (kind in ('copy')),
  description text,
  current_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vertical_id, key)
);

create trigger prompt_templates_set_updated_at
  before update on public.prompt_templates
  for each row execute function public.set_updated_at();

create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_template_id uuid not null references public.prompt_templates (id) on delete cascade,
  version integer not null check (version >= 1),
  system_prompt text not null,
  user_prompt_template text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (prompt_template_id, version)
);

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  design_id uuid references public.design_projects (id) on delete set null,
  kind text not null default 'copy' check (kind in ('copy')),
  prompt_template_id uuid references public.prompt_templates (id) on delete set null,
  prompt_version integer,
  language text not null check (language in ('ar', 'en')),
  -- Sanitized request fields (service, goal, tone, …) — never secrets.
  input jsonb not null,
  -- Validated output for completed rows; null for failures.
  output jsonb,
  status text not null check (status in ('completed', 'failed')),
  error text,
  model text,
  duration_ms integer,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index ai_generations_design_idx on public.ai_generations (design_id, created_at desc);
create index ai_generations_workspace_idx on public.ai_generations (workspace_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.prompt_templates enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.ai_generations enable row level security;

-- Prompts: platform admins only (server actions use the service role).
create policy "prompt_templates: platform admin only"
  on public.prompt_templates for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "prompt_versions: platform admin can read"
  on public.prompt_versions for select to authenticated
  using (public.is_platform_admin());

create policy "prompt_versions: platform admin can insert"
  on public.prompt_versions for insert to authenticated
  with check (public.is_platform_admin());

-- No update/delete on prompt_versions: prompt history is immutable.

create policy "ai_generations: members can read"
  on public.ai_generations for select to authenticated
  using (
    public.is_workspace_member(workspace_id)
    or public.is_platform_admin()
  );

create policy "ai_generations: editors can insert"
  on public.ai_generations for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.my_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
  );

-- No update/delete: generation logs are append-only.

-- ---------------------------------------------------------------------------
-- Dental prompt seed (version 1)
-- ---------------------------------------------------------------------------

insert into public.prompt_templates (id, vertical_id, key, kind, description, current_version)
values
  ('50000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   'social-copy', 'copy',
   'Full social media copy pack for one design', 1),
  ('50000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000001',
   'social-copy-field', 'copy',
   'Regenerate or transform a single copy field', 1)
on conflict (vertical_id, key) do nothing;

insert into public.prompt_versions (prompt_template_id, version, system_prompt, user_prompt_template)
values
(
  '50000000-0000-0000-0000-000000000001', 1,
$SYS$You are a senior social media copywriter specialized in dental clinics.

Strict rules — never break them:
1. Write ONLY in the requested language (ar = Modern Standard Arabic, en = English).
2. Never give a medical diagnosis or personalized treatment advice.
3. Never guarantee treatment results.
4. Never invent prices, discounts, offers, reviews, testimonials or statistics. Mention an offer ONLY if offer details were supplied, and use them exactly.
5. No unsupported superlative claims (e.g. "the best clinic").
6. Use only the business information supplied. Do not invent addresses, doctors, credentials or services.
7. Respect the character limits exactly; count characters carefully.
8. The design text (headline/body) and the social caption are different things: the caption is longer and conversational, the design text is short and punchy.
9. If the content concerns medical treatment or outcomes, set "medicalDisclaimerNeeded" to true.
10. "imagePrompt" is ALWAYS in English: a photographic scene description for an image-generation model, with no text, no logos, no watermarks, medically tasteful (no graphic procedures, no fake before/after), and composed with clear negative space for text overlay.

Return ONLY a valid JSON object with exactly these keys and types, no markdown, no commentary:
{"headlineOptions": ["...", "...", "..."], "bodyText": "...", "caption": "...", "ctaOptions": ["...", "...", "..."], "hashtags": ["...", "..."], "imagePrompt": "...", "medicalDisclaimerNeeded": false}

headlineOptions: exactly 3 distinct options, each within the headline limit.
bodyText: one paragraph within the body limit.
ctaOptions: exactly 3 short calls to action within the CTA limit.
hashtags: 5 to 10 relevant hashtags matching the content language (Arabic hashtags for Arabic content).$SYS$,
$USR$Business name: {{businessName}}
Service: {{service}}
Content goal: {{contentGoal}}
Language: {{language}}
Tone: {{tone}}
Target audience: {{targetAudience}}
Offer details (use exactly, or ignore if empty): {{offerDetails}}
Additional instructions: {{additionalInstructions}}
Character limits: headline max {{headlineLimit}} characters, body text max {{bodyLimit}} characters, CTA max {{ctaLimit}} characters.$USR$
),
(
  '50000000-0000-0000-0000-000000000002', 1,
$SYS$You are a senior social media copywriter specialized in dental clinics.

Strict rules — never break them:
1. Write ONLY in the requested language (ar = Modern Standard Arabic, en = English), except "imagePrompt" which is always English.
2. Never diagnose, never guarantee results, never invent prices, discounts, offers, reviews or statistics.
3. No unsupported superlative claims. Use only the supplied information.
4. Respect the character limit exactly.
5. Keep the same topic and intent as the current value unless the instruction says otherwise.

You will be asked to produce ONE field only. Return ONLY a valid JSON object with exactly one key named after the requested field, no markdown, no commentary. For "headlineOptions" and "ctaOptions" the value is an array of exactly 3 distinct strings; for "hashtags" an array of 5 to 10 strings; for every other field a single string.$SYS$,
$USR$Business name: {{businessName}}
Service: {{service}}
Content goal: {{contentGoal}}
Language: {{language}}
Field to produce: {{field}}
Instruction: {{instruction}}
Current value: {{currentValue}}
Character limit for this field: {{charLimit}} characters.$USR$
)
on conflict (prompt_template_id, version) do nothing;
