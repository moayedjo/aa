"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  cancelSubscription,
  reactivateSubscription,
  changePlan,
} from "@/lib/billing/actions";
import { PlanPicker } from "@/components/billing/plan-picker";
import type { Plan, Subscription } from "@/lib/billing/types";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ManageSubscriptionProps {
  workspaceId: string;
  plans: Plan[];
  subscription: Subscription;
  currentPlanKey: string | null;
}

const STATUS_COPY: Record<string, string> = {
  trialing: "On trial",
  active: "Active",
  past_due: "Payment overdue",
  paused: "Paused",
  canceled: "Canceled",
  expired: "Expired",
};

export function ManageSubscription({
  workspaceId,
  plans,
  subscription,
  currentPlanKey,
}: ManageSubscriptionProps) {
  const router = useRouter();
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const run = (fn: () => Promise<{ error?: string; success?: string }>) =>
    startTransition(async () => {
      setMessage(null);
      const result = await fn();
      if (result.error) setMessage({ type: "error", text: result.error });
      else if (result.success) {
        setMessage({ type: "success", text: result.success });
        router.refresh();
      }
    });

  const renewal = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : "—";

  return (
    <div className="space-y-6">
      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "success"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {subscription.status === "past_due" && (
        <Alert variant="destructive">
          <AlertDescription>
            Your last payment failed. Please update your payment method to keep
            your subscription active.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current subscription</CardTitle>
          <CardDescription>
            {STATUS_COPY[subscription.status]} ·{" "}
            {subscription.billing_period === "year" ? "Annual" : "Monthly"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {subscription.cancel_at_period_end
                ? "Access until"
                : "Renews on"}
            </span>
            <span className="font-medium">{renewal}</span>
          </div>

          {subscription.cancel_at_period_end ? (
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Your subscription is set to cancel at the end of the period.
              </p>
              <Button
                size="sm"
                disabled={isPending}
                onClick={() => run(() => reactivateSubscription(workspaceId))}
              >
                Keep my subscription
              </Button>
            </div>
          ) : subscription.status === "active" ||
            subscription.status === "trialing" ? (
            <div className="space-y-2">
              {confirmingCancel ? (
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-muted-foreground">
                    Cancel your subscription? You&apos;ll keep access until{" "}
                    {renewal}, and you can reactivate any time before then.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isPending}
                      onClick={() =>
                        run(() => cancelSubscription(workspaceId))
                      }
                    >
                      Yes, cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmingCancel(false)}
                    >
                      Keep it
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmingCancel(true)}
                >
                  Cancel subscription
                </Button>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Change plan</h2>
        <PlanPicker
          workspaceId={workspaceId}
          plans={plans}
          currentPlanKey={currentPlanKey}
          hasSubscription
          onChangePlan={(planKey, period) =>
            run(() =>
              changePlan({ workspaceId, planKey, billingPeriod: period })
            )
          }
        />
      </div>
    </div>
  );
}
