"use client";

import { useState, useTransition } from "react";

import type { WizardBrandState } from "@/components/onboarding/wizard";
import type { BrandCompletion } from "@/lib/brand-kit/score";
import { completeOnboarding } from "@/lib/brand-kit/actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ReviewStepProps {
  workspaceId: string;
  brand: WizardBrandState;
  completion: BrandCompletion;
  onBack: () => void;
}

export function ReviewStep({
  workspaceId,
  brand,
  completion,
  onBack,
}: ReviewStepProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const finish = () =>
    startTransition(async () => {
      setServerError(null);
      // Redirects to the workspace page on success.
      const result = await completeOnboarding(workspaceId);
      if (result?.error) setServerError(result.error);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Review & finish</CardTitle>
        <CardDescription>
          Your brand is {completion.score}% complete. You can update anything
          later from your workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <div
          role="progressbar"
          aria-valuenow={completion.score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Brand completion"
          className="h-2 w-full overflow-hidden rounded-full bg-secondary"
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${completion.score}%` }}
          />
        </div>

        {completion.missing.length > 0 ? (
          <div className="text-sm">
            <p className="font-medium">Still missing:</p>
            <ul className="mt-1 list-inside list-disc text-muted-foreground">
              {completion.missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Everything is filled in — great start.
          </p>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Business</dt>
          <dd>{brand.businessName || "—"}</dd>
          <dt className="text-muted-foreground">Language</dt>
          <dd>{brand.defaultLanguage === "ar" ? "العربية" : "English"}</dd>
          <dt className="text-muted-foreground">Industry</dt>
          <dd>{brand.industryKey}</dd>
          <dt className="text-muted-foreground">Services</dt>
          <dd>{brand.services.length} selected</dd>
        </dl>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="button" onClick={finish} disabled={isPending}>
            {isPending ? "Finishing…" : "Finish onboarding"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
