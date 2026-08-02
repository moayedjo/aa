"use client";

import { useState } from "react";

import type { StepProps } from "@/components/onboarding/wizard";
import { saveOnboardingStep } from "@/lib/brand-kit/actions";
import type { IndustryVertical } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function LanguageStep({
  workspaceId,
  brand,
  update,
  onSaved,
  onBack,
  verticals,
}: StepProps & { verticals: IndustryVertical[] }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState<"ar" | "en">(brand.defaultLanguage);
  const [industryKey, setIndustryKey] = useState(brand.industryKey);

  const submit = async () => {
    setServerError(null);
    setSaving(true);
    const result = await saveOnboardingStep(workspaceId, {
      step: "language",
      defaultLanguage: language,
      industryKey,
    });
    setSaving(false);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    update({ defaultLanguage: language, industryKey });
    onSaved();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Language & industry</CardTitle>
        <CardDescription>
          The default language for your content and your industry.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Default content language</legend>
          <div className="flex gap-2">
            {(
              [
                { value: "ar", label: "العربية (RTL)" },
                { value: "en", label: "English (LTR)" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setLanguage(option.value);
                  update({ defaultLanguage: option.value });
                }}
                className={cn(
                  "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                  language === option.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Industry</legend>
          <div className="flex flex-wrap gap-2">
            {verticals.map((vertical) => (
              <button
                key={vertical.key}
                type="button"
                disabled={!vertical.is_available}
                onClick={() => setIndustryKey(vertical.key)}
                className={cn(
                  "rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
                  industryKey === vertical.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                {vertical.label_en} · {vertical.label_ar}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            More industries are coming after the dental MVP.
          </p>
        </fieldset>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="button" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save & continue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
