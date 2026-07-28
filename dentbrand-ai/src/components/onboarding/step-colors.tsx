"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { StepProps } from "@/components/onboarding/wizard";
import { saveOnboardingStep } from "@/lib/brand-kit/actions";
import { colorsStepSchema } from "@/lib/validation/brand-kit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const formSchema = colorsStepSchema.omit({ step: true });
type FormValues = z.infer<typeof formSchema>;

const FIELDS: { name: keyof FormValues; label: string }[] = [
  { name: "primaryColor", label: "Primary" },
  { name: "secondaryColor", label: "Secondary" },
  { name: "accentColor", label: "Accent (buttons, highlights)" },
  { name: "backgroundColor", label: "Background" },
  { name: "textColor", label: "Text" },
];

export function ColorsStep({ workspaceId, brand, update, onSaved, onBack }: StepProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor,
      accentColor: brand.accentColor,
      backgroundColor: brand.backgroundColor,
      textColor: brand.textColor,
    },
  });

  // Keep the live preview in sync while picking.
  const syncPreview = () => update({ ...getValues() });

  const onSubmit = async (formValues: FormValues) => {
    setServerError(null);
    const result = await saveOnboardingStep(workspaceId, {
      step: "colors",
      ...formValues,
    });
    if (result.error) {
      setServerError(result.error);
      return;
    }
    update({ ...formValues });
    onSaved();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Brand colors</CardTitle>
        <CardDescription>
          Templates apply these colors automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          onChange={syncPreview}
          className="space-y-4"
          noValidate
        >
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                <input
                  id={field.name}
                  type="color"
                  className="h-10 w-full cursor-pointer rounded-md border border-input bg-background p-1"
                  {...register(field.name)}
                />
                {errors[field.name] && (
                  <p className="text-sm text-destructive">
                    {errors[field.name]?.message}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save & continue"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
