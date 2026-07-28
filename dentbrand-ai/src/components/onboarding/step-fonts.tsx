"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { StepProps } from "@/components/onboarding/wizard";
import { saveOnboardingStep } from "@/lib/brand-kit/actions";
import { fontsStepSchema } from "@/lib/validation/brand-kit";
import {
  APPROVED_ARABIC_FONTS,
  APPROVED_ENGLISH_FONTS,
} from "@/lib/industries/config";
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

const formSchema = fontsStepSchema.omit({ step: true });
type FormValues = z.infer<typeof formSchema>;

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function FontsStep({ workspaceId, brand, update, onSaved, onBack }: StepProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      arabicFont: (brand.arabicFont || undefined) as FormValues["arabicFont"],
      englishFont: (brand.englishFont || undefined) as FormValues["englishFont"],
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const result = await saveOnboardingStep(workspaceId, {
      step: "fonts",
      ...values,
    });
    if (result.error) {
      setServerError(result.error);
      return;
    }
    update({ arabicFont: values.arabicFont, englishFont: values.englishFont });
    onSaved();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Fonts</CardTitle>
        <CardDescription>
          One approved font per language keeps designs consistent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="arabicFont">Arabic font</Label>
            <select
              id="arabicFont"
              className={selectClass}
              aria-invalid={!!errors.arabicFont}
              defaultValue={brand.arabicFont || ""}
              {...register("arabicFont")}
            >
              <option value="" disabled>
                Choose a font…
              </option>
              {APPROVED_ARABIC_FONTS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
            {errors.arabicFont && (
              <p className="text-sm text-destructive">{errors.arabicFont.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="englishFont">English font</Label>
            <select
              id="englishFont"
              className={selectClass}
              aria-invalid={!!errors.englishFont}
              defaultValue={brand.englishFont || ""}
              {...register("englishFont")}
            >
              <option value="" disabled>
                Choose a font…
              </option>
              {APPROVED_ENGLISH_FONTS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
            {errors.englishFont && (
              <p className="text-sm text-destructive">{errors.englishFont.message}</p>
            )}
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
