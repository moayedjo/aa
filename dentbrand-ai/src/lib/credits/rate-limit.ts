import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lightweight rate limiting for AI actions, backed by the append-only
 * ai_generations log (no extra table). Caps how many generations a
 * workspace can start in a rolling window — a cheap abuse guard on top of
 * the hard credit limit.
 */

interface RateRule {
  windowSeconds: number;
  max: number;
}

const RULES: Record<string, RateRule> = {
  // Up to 20 image generations per workspace per 10 minutes.
  image: { windowSeconds: 600, max: 20 },
};

export interface RateLimitResult {
  ok: boolean;
  error?: string;
}

export async function checkRateLimit(
  workspaceId: string,
  _userId: string,
  kind: keyof typeof RULES | string
): Promise<RateLimitResult> {
  const rule = RULES[kind];
  if (!rule) return { ok: true };

  const since = new Date(Date.now() - rule.windowSeconds * 1000).toISOString();
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("kind", kind)
    .gte("created_at", since);

  if (error) {
    // Fail open on a counting error — the hard credit limit still applies.
    return { ok: true };
  }
  if ((count ?? 0) >= rule.max) {
    return {
      ok: false,
      error: "You've generated a lot recently — please wait a few minutes.",
    };
  }
  return { ok: true };
}
