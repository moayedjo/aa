"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { StepProps } from "@/components/onboarding/wizard";
import { saveOnboardingStep, saveLogoPath } from "@/lib/brand-kit/actions";
import { uploadLogo } from "@/lib/brand-kit/upload";
import { identityStepSchema } from "@/lib/validation/brand-kit";
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

const formSchema = identityStepSchema.omit({ step: true });
type FormValues = z.infer<typeof formSchema>;

export function IdentityStep({ workspaceId, brand, update, onSaved }: StepProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { businessName: brand.businessName },
  });

  const onLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setServerError(null);
    setUploading(true);
    const uploaded = await uploadLogo(workspaceId, file);
    if (uploaded.error || !uploaded.path) {
      setServerError(uploaded.error ?? "Upload failed");
      setUploading(false);
      return;
    }
    const saved = await saveLogoPath(workspaceId, uploaded.path);
    if (saved.error) {
      setServerError(saved.error);
    } else {
      update({
        logoPath: uploaded.path,
        logoSignedUrl: uploaded.signedUrl ?? brand.logoSignedUrl,
      });
    }
    setUploading(false);
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const result = await saveOnboardingStep(workspaceId, {
      step: "identity",
      ...values,
    });
    if (result.error) {
      setServerError(result.error);
      return;
    }
    update({ businessName: values.businessName });
    onSaved();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Business identity</CardTitle>
        <CardDescription>
          The name and logo that appear on your designs.
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
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              aria-invalid={!!errors.businessName}
              {...register("businessName")}
            />
            {errors.businessName && (
              <p className="text-sm text-destructive">
                {errors.businessName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Logo (PNG, JPG, SVG or WebP, max 2 MB)</Label>
            <Input
              id="logo"
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={onLogoChange}
              disabled={uploading}
            />
            <p className="text-sm text-muted-foreground">
              {uploading
                ? "Uploading…"
                : brand.logoPath
                  ? "Logo uploaded. Choose a new file to replace it."
                  : "Optional now — you can add it later."}
            </p>
          </div>

          <Button type="submit" disabled={isSubmitting || uploading}>
            {isSubmitting ? "Saving…" : "Save & continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
