"use client";

import { useState } from "react";

import type { StepProps } from "@/components/onboarding/wizard";
import { saveOnboardingStep } from "@/lib/brand-kit/actions";
import type { Service } from "@/types/database";
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

export function ServicesStep({
  workspaceId,
  brand,
  update,
  onSaved,
  onBack,
  services,
}: StepProps & { services: Service[] }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>(brand.services);

  const toggle = (key: string) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const submit = async () => {
    setServerError(null);
    if (selected.length === 0) {
      setServerError("Select at least one service");
      return;
    }
    setSaving(true);
    const result = await saveOnboardingStep(workspaceId, {
      step: "services",
      services: selected,
    });
    setSaving(false);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    update({ services: selected });
    onSaved();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Your services</CardTitle>
        <CardDescription>
          Templates and AI content are tailored to the services you offer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((service) => {
            const active = selected.includes(service.key);
            return (
              <button
                key={service.key}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(service.key)}
                className={cn(
                  "rounded-md border px-3 py-2 text-start text-sm transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                <span className="block font-medium">{service.label_en}</span>
                <span className="block text-xs opacity-80" dir="rtl" lang="ar">
                  {service.label_ar}
                </span>
              </button>
            );
          })}
        </div>

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
