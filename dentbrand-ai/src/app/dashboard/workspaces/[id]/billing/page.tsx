import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { getWorkspace, getMyWorkspaceRole } from "@/lib/workspaces/queries";
import {
  getPlans,
  getSubscription,
  isSubscriptionActive,
} from "@/lib/billing/queries";
import { PlanPicker } from "@/components/billing/plan-picker";
import { ManageSubscription } from "@/components/billing/manage-subscription";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await getWorkspace(id);
  if (!workspace) notFound();

  // Billing is owner/admin only.
  const role = await getMyWorkspaceRole(id);
  if (role !== "owner" && role !== "admin") {
    redirect(`/dashboard/workspaces/${id}`);
  }

  const [plans, subscription] = await Promise.all([
    getPlans(),
    getSubscription(id),
  ]);
  const currentPlanKey =
    plans.find((p) => p.id === subscription?.plan_id)?.key ?? null;
  const active = isSubscriptionActive(subscription);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/workspaces/${id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {workspace.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Billing</h1>
      </div>

      {subscription && (active || subscription.cancel_at_period_end) ? (
        <ManageSubscription
          workspaceId={id}
          plans={plans}
          subscription={subscription}
          currentPlanKey={currentPlanKey}
        />
      ) : (
        <>
          {subscription && subscription.status === "past_due" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment overdue</CardTitle>
                <CardDescription>
                  Update your payment method to restore access.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Choose a plan</h2>
            <p className="text-sm text-muted-foreground">
              Subscriptions activate once payment is confirmed by our billing
              provider — not from the browser redirect.
            </p>
            <PlanPicker
              workspaceId={id}
              plans={plans}
              currentPlanKey={currentPlanKey}
              hasSubscription={false}
            />
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Refund &amp; cancellation policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Cancel any time from this page — access continues until the end of the paid period.</p>
          <p>
            Annual plans include a reminder before renewal. Refunds follow our
            published refund policy; contact support for a pro-rated review.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
