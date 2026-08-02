"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { StepProps } from "@/components/onboarding/wizard";
import { saveOnboardingStep } from "@/lib/brand-kit/actions";
import { contactStepSchema } from "@/lib/validation/brand-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const formSchema = contactStepSchema.omit({ step: true });
type FormValues = z.infer<typeof formSchema>;

export function ContactStep({ workspaceId, brand, update, onSaved, onBack }: StepProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: brand.phone,
      website: brand.website,
      address: brand.address,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const result = await saveOnboardingStep(workspaceId, {
      step: "contact",
      ...values,
    });
    if (result.error) {
      setServerError(result.error);
      return;
    }
    update({
      phone: values.phone,
      website: values.website ?? "",
      address: values.address ?? "",
    });
    onSaved();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Contact information</CardTitle>
        <CardDescription>
          Shown on designs so patients can reach you.
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
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              dir="ltr"
              placeholder="+962 7 9000 0000"
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website (optional)</Label>
            <Input
              id="website"
              type="url"
              dir="ltr"
              placeholder="https://your-clinic.com"
              aria-invalid={!!errors.website}
              {...register("website")}
            />
            {errors.website && (
              <p className="text-sm text-destructive">{errors.website.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address (optional)</Label>
            <Input
              id="address"
              aria-invalid={!!errors.address}
              {...register("address")}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
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
