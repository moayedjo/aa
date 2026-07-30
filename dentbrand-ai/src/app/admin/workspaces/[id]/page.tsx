import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { createAdminClient } from "@/lib/supabase/admin";
import { CreditAdjustForm } from "@/components/admin/credit-adjust-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Workspace · Admin" };

export default async function AdminWorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Admin layout already gates on isPlatformAdmin(); use the service role
  // to read across the workspace.
  const admin = createAdminClient();

  const { data: workspace } = await admin
    .from("workspaces")
    .select("id, name, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!workspace) notFound();

  const [{ data: wallet }, { data: subscription }, { data: members }, { data: ledger }] =
    await Promise.all([
      admin
        .from("credit_wallets")
        .select("balance, monthly_allowance")
        .eq("workspace_id", id)
        .maybeSingle(),
      admin
        .from("subscriptions")
        .select("status, billing_period, current_period_end")
        .eq("workspace_id", id)
        .maybeSingle(),
      admin
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", id),
      admin
        .from("credit_ledger")
        .select("entry_type, amount, balance_after, reason, created_at")
        .eq("workspace_id", id)
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/workspaces"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← All workspaces
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{workspace.name}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Balance</p>
            <p className="mt-1 text-2xl font-bold">
              {wallet?.balance ?? "—"}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {wallet?.monthly_allowance ?? "—"}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">
              Subscription
            </p>
            <p className="mt-1 text-lg font-bold">
              {subscription?.status ?? "none"}
            </p>
            <p className="text-xs text-muted-foreground">
              {subscription?.billing_period ?? ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Members</p>
            <p className="mt-1 text-2xl font-bold">{members?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Adjust credits</CardTitle>
          <CardDescription>
            Grant or remove image credits. Recorded in the ledger and audit
            log.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreditAdjustForm workspaceId={id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent credit activity</CardTitle>
        </CardHeader>
        <CardContent>
          {!ledger || ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity.</p>
          ) : (
            <ul className="divide-y text-sm">
              {ledger.map((e, i) => (
                <li key={i} className="flex justify-between py-2">
                  <span>
                    {e.entry_type}
                    {e.reason ? ` · ${e.reason}` : ""}
                  </span>
                  <span>
                    {e.amount >= 0 ? "+" : ""}
                    {e.amount} → {e.balance_after}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
