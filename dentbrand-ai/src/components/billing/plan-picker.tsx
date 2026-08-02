"use client";

import { useState } from "react";

import { createCheckout } from "@/lib/billing/actions";
import { openPaddleCheckout } from "@/lib/billing/checkout-client";
import type { Plan } from "@/lib/billing/types";
import { formatPrice } from "@/lib/billing/types";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PlanPickerProps {
  workspaceId: string;
  plans: Plan[];
  currentPlanKey: string | null;
  hasSubscription: boolean;
  onChangePlan?: (planKey: string, period: "month" | "year") => void;
}

export function PlanPicker({
  workspaceId,
  plans,
  currentPlanKey,
  hasSubscription,
  onChangePlan,
}: PlanPickerProps) {
  // Annual is NOT selected by default (spec §16).
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async (planKey: string) => {
    setError(null);
    setBusyKey(planKey);
    const result = await createCheckout({ workspaceId, planKey, billingPeriod: period });
    if (result.error || !result.transactionId) {
      setError(result.error ?? "Could not start checkout");
      setBusyKey(null);
      return;
    }
    const opened = await openPaddleCheckout(result.transactionId);
    if (!opened.ok) setError(opened.error ?? "Could not open checkout");
    setBusyKey(null);
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm">Billing period:</span>
        <div className="flex gap-1 rounded-md border p-0.5 text-sm">
          {(["month", "year"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded px-3 py-1",
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
            >
              {p === "month" ? "Monthly" : "Annual (2 months free)"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlanKey;
          const cents =
            period === "year" ? plan.price_year_cents : plan.price_month_cents;
          return (
            <Card
              key={plan.id}
              className={cn(isCurrent && "ring-2 ring-primary")}
            >
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <p className="text-2xl font-bold">
                  {formatPrice(cents, plan.currency)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{period === "year" ? "yr" : "mo"}
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>{plan.monthly_designs} designs / month</li>
                  <li>{plan.monthly_image_credits} image credits / month</li>
                  <li>
                    {plan.member_limit} member
                    {plan.member_limit === 1 ? "" : "s"}
                  </li>
                </ul>
                {isCurrent ? (
                  <p className="text-sm font-medium text-primary">
                    Current plan
                  </p>
                ) : hasSubscription && onChangePlan ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={busyKey === plan.key}
                    onClick={() => onChangePlan(plan.key, period)}
                  >
                    Switch to {plan.name}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={busyKey === plan.key}
                    onClick={() => startCheckout(plan.key)}
                  >
                    {busyKey === plan.key ? "Starting…" : `Choose ${plan.name}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
