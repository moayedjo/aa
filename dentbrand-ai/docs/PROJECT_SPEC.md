# DentBrand AI — Project Spec

## What it is

A vertical SaaS that helps businesses generate branded social media designs
using a Brand Kit, industry-specific templates, AI copy, AI images, a
lightweight editor, reliable autosave/recovery, transparent credits, and
subscription billing. The MVP targets **dental clinics**; the architecture
must support other verticals later without rework.

## Product principles

1. Speed to first useful design.
2. Simplicity for non-designers.
3. High-quality templates over quantity.
4. Reliable saving (higher priority than AI).
5. Accurate export (PNG matches editor).
6. Clear usage limits and credit costs shown up front.
7. Credit refunds on failed AI generations.
8. Transparent, in-app subscription cancellation.
9. Arabic RTL support throughout.
10. Industry specialization — not a general Canva clone.

## MVP success journey

Signup → Create Workspace → Complete Brand Kit → Select Service → Select
Content Goal → Select Template → Generate Copy → Generate/Upload Image →
Edit Design → Autosave → Restore Version → Export PNG → View Usage →
Subscribe → Cancel Subscription.

## Out of scope for MVP

Mobile apps, video editing, auto-publishing/scheduling to social media,
full Canva-style editing (free drawing, pen tool, vector nodes, plugins,
animation), direct Figma/Illustrator import, realtime collaboration,
marketplace, multi-page carousels, logo generation, WhatsApp integration,
patient data storage, personalized medical content, diagnosis.

## Approved stack

- **App**: Next.js (App Router), TypeScript strict, Tailwind CSS, shadcn/ui
- **Forms/validation**: React Hook Form, Zod
- **Auth/DB/storage**: Supabase (Auth, PostgreSQL, Storage, RLS) — never Clerk,
  never Replit PostgreSQL for app data
- **Editor**: React Konva, Zustand
- **AI**: Gemini API (text) + Gemini-compatible image API, server-side only
- **Billing**: Paddle Checkout + Webhooks (webhooks are the source of truth)
- **Supporting**: Resend, PostHog, Sentry

Stack replacements require a documented blocker, options, proposal, and
explicit user approval (see `DECISIONS.md`).

## Delivery model

The product is built **one approved phase at a time** (see `PHASES.md`).
Never build ahead; never create future tables, routes, or dependencies.
Continuation requires an explicit command of the form
`APPROVE PHASE NN AND CONTINUE TO PHASE MM`.
