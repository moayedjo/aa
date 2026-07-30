import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Admin read models. These use the service-role client (bypassing RLS) and
 * are ONLY ever called from routes/actions already gated by
 * `isPlatformAdmin()`. Never import from a non-admin path.
 */

export interface AdminKpis {
  users: number;
  workspaces: number;
  activeSubscriptions: number;
  designs: number;
  exportsTotal: number;
  exportSuccessRate: number | null;
  aiCopyFailures: number;
  aiImageFailures: number;
  creditRefunds: number;
  avgRating: number | null;
}

export async function getAdminKpis(): Promise<AdminKpis> {
  const admin = createAdminClient();

  const countRows = async (table: string): Promise<number> => {
    const { count: c } = await admin
      .from(table)
      .select("*", { count: "exact", head: true });
    return c ?? 0;
  };

  const [users, workspaces, designs] = await Promise.all([
    countRows("profiles"),
    countRows("workspaces"),
    countRows("design_projects"),
  ]);

  const { count: activeSubscriptions } = await admin
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .in("status", ["active", "trialing"]);

  const { count: exportsTotal } = await admin
    .from("design_exports")
    .select("*", { count: "exact", head: true });
  const { count: exportsOk } = await admin
    .from("design_exports")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");

  const { count: aiCopyFailures } = await admin
    .from("ai_generations")
    .select("*", { count: "exact", head: true })
    .eq("kind", "copy")
    .eq("status", "failed");
  const { count: aiImageFailures } = await admin
    .from("ai_generations")
    .select("*", { count: "exact", head: true })
    .eq("kind", "image")
    .eq("status", "failed");

  const { count: creditRefunds } = await admin
    .from("credit_ledger")
    .select("*", { count: "exact", head: true })
    .eq("entry_type", "refund");

  const { data: ratings } = await admin
    .from("design_ratings")
    .select("rating");
  const avgRating =
    ratings && ratings.length > 0
      ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
      : null;

  const total = exportsTotal ?? 0;
  return {
    users,
    workspaces,
    activeSubscriptions: activeSubscriptions ?? 0,
    designs,
    exportsTotal: total,
    exportSuccessRate: total > 0 ? (exportsOk ?? 0) / total : null,
    aiCopyFailures: aiCopyFailures ?? 0,
    aiImageFailures: aiImageFailures ?? 0,
    creditRefunds: creditRefunds ?? 0,
    avgRating,
  };
}

export interface AdminWorkspaceRow {
  id: string;
  name: string;
  created_at: string;
  balance: number | null;
  subscriptionStatus: string | null;
}

export async function getAdminWorkspaces(
  limit = 100
): Promise<AdminWorkspaceRow[]> {
  const admin = createAdminClient();
  const { data: workspaces } = await admin
    .from("workspaces")
    .select("id, name, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!workspaces) return [];

  const ids = workspaces.map((w) => w.id);
  const [{ data: wallets }, { data: subs }] = await Promise.all([
    admin.from("credit_wallets").select("workspace_id, balance").in("workspace_id", ids),
    admin.from("subscriptions").select("workspace_id, status").in("workspace_id", ids),
  ]);

  return workspaces.map((w) => ({
    id: w.id,
    name: w.name,
    created_at: w.created_at,
    balance: wallets?.find((x) => x.workspace_id === w.id)?.balance ?? null,
    subscriptionStatus:
      subs?.find((x) => x.workspace_id === w.id)?.status ?? null,
  }));
}

export interface TemplatePerformanceRow {
  templateId: string;
  name: string;
  designs: number;
  exports: number;
}

/** Template performance = designs created & exports, grouped by template. */
export async function getTemplatePerformance(): Promise<TemplatePerformanceRow[]> {
  const admin = createAdminClient();
  const { data: templates } = await admin
    .from("templates")
    .select("id, name");
  if (!templates) return [];

  const { data: designs } = await admin
    .from("design_projects")
    .select("id, template_id");
  const { data: exports } = await admin
    .from("design_exports")
    .select("design_id");

  const designTemplate = new Map<string, string>();
  const designCounts = new Map<string, number>();
  for (const d of designs ?? []) {
    designTemplate.set(d.id, d.template_id);
    designCounts.set(d.template_id, (designCounts.get(d.template_id) ?? 0) + 1);
  }
  const exportCounts = new Map<string, number>();
  for (const e of exports ?? []) {
    const tid = designTemplate.get(e.design_id);
    if (tid) exportCounts.set(tid, (exportCounts.get(tid) ?? 0) + 1);
  }

  return templates
    .map((t) => ({
      templateId: t.id,
      name: t.name,
      designs: designCounts.get(t.id) ?? 0,
      exports: exportCounts.get(t.id) ?? 0,
    }))
    .sort((a, b) => b.exports - a.exports);
}

export interface SupportTicketRow {
  id: string;
  workspace_id: string;
  design_id: string | null;
  kind: string;
  message: string;
  status: string;
  created_at: string;
}

export async function getSupportTickets(
  status: "open" | "closed" = "open"
): Promise<SupportTicketRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("support_requests")
    .select("id, workspace_id, design_id, kind, message, status, created_at")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);
  return data ?? [];
}

export interface AuditRow {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  workspace_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export async function getAuditLog(limit = 100): Promise<AuditRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AuditRow[];
}
