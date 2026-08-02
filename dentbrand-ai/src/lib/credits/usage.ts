import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

/** Bumps the monthly designs-created counter (best-effort; never blocks). */
export async function recordDesignCreated(workspaceId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.rpc("increment_usage", {
      p_workspace_id: workspaceId,
      p_period: currentPeriod(),
      p_field: "designs_created",
    });
  } catch {
    // Usage counting must not break design creation.
  }
}
