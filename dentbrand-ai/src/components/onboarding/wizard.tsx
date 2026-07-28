"use client";

import { useState } from "react";

import type { BrandKit, WorkspaceIndustrySettings } from "@/types/database";
import { computeBrandCompletion } from "@/lib/brand-kit/score";
import { LivePreview } from "@/components/onboarding/live-preview";
import { IdentityStep } from "@/components/onboarding/step-identity";
import { ColorsStep } from "@/components/onboarding/step-colors";
import { FontsStep } from "@/components/onboarding/step-fonts";
import { ContactStep } from "@/components/onboarding/step-contact";
import { LanguageStep } from "@/components/onboarding/step-language";
import { ServicesStep } from "@/components/onboarding/step-services";
import { ReviewStep } from "@/components/onboarding/step-review";
import { cn } from "@/lib/utils";

export interface WizardBrandState {
  businessName: string;
  logoPath: string | null;
  logoSignedUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  arabicFont: string;
  englishFont: string;
  phone: string;
  website: string;
  address: string;
  defaultLanguage: "ar" | "en";
  industryKey: string;
  services: string[];
}

const STEPS = [
  { key: "identity", title: "Identity" },
  { key: "colors", title: "Colors" },
  { key: "fonts", title: "Fonts" },
  { key: "contact", title: "Contact" },
  { key: "language", title: "Language" },
  { key: "services", title: "Services" },
  { key: "review", title: "Finish" },
] as const;

interface WizardProps {
  workspaceId: string;
  workspaceName: string;
  brandKit: BrandKit | null;
  settings: WorkspaceIndustrySettings | null;
  logoSignedUrl: string | null;
  initialStep: number;
}

export function OnboardingWizard({
  workspaceId,
  workspaceName,
  brandKit,
  settings,
  logoSignedUrl,
  initialStep,
}: WizardProps) {
  const [stepIndex, setStepIndex] = useState(
    Math.min(Math.max(initialStep, 0), STEPS.length - 1)
  );
  const [brand, setBrand] = useState<WizardBrandState>({
    businessName: brandKit?.business_name ?? workspaceName,
    logoPath: brandKit?.logo_path ?? null,
    logoSignedUrl,
    primaryColor: brandKit?.primary_color ?? "#0e7490",
    secondaryColor: brandKit?.secondary_color ?? "#155e75",
    accentColor: brandKit?.accent_color ?? "#f59e0b",
    backgroundColor: brandKit?.background_color ?? "#f8fafc",
    textColor: brandKit?.text_color ?? "#0f172a",
    arabicFont: brandKit?.arabic_font ?? "",
    englishFont: brandKit?.english_font ?? "",
    phone: brandKit?.phone ?? "",
    website: brandKit?.website ?? "",
    address: brandKit?.address ?? "",
    defaultLanguage: brandKit?.default_language ?? "en",
    industryKey: settings?.industry_key ?? "dental",
    services: settings?.selected_services ?? [],
  });

  const update = (patch: Partial<WizardBrandState>) =>
    setBrand((prev) => ({ ...prev, ...patch }));

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const completion = computeBrandCompletion(
    brandKitFromState(brand, brandKit),
    settingsFromState(brand, settings)
  );

  const stepProps = { workspaceId, brand, update, onSaved: goNext, onBack: goBack };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <nav aria-label="Onboarding steps" className="flex flex-wrap gap-2">
          {STEPS.map((step, i) => (
            <button
              key={step.key}
              type="button"
              onClick={() => setStepIndex(i)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                i === stepIndex
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {i + 1}. {step.title}
            </button>
          ))}
        </nav>

        {stepIndex === 0 && <IdentityStep {...stepProps} />}
        {stepIndex === 1 && <ColorsStep {...stepProps} />}
        {stepIndex === 2 && <FontsStep {...stepProps} />}
        {stepIndex === 3 && <ContactStep {...stepProps} />}
        {stepIndex === 4 && <LanguageStep {...stepProps} />}
        {stepIndex === 5 && <ServicesStep {...stepProps} />}
        {stepIndex === 6 && (
          <ReviewStep
            workspaceId={workspaceId}
            brand={brand}
            completion={completion}
            onBack={goBack}
          />
        )}
      </div>

      <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        <p className="text-sm font-medium text-muted-foreground">
          Live preview · Brand completion {completion.score}%
        </p>
        <LivePreview brand={brand} />
      </aside>
    </div>
  );
}

export interface StepProps {
  workspaceId: string;
  brand: WizardBrandState;
  update: (patch: Partial<WizardBrandState>) => void;
  onSaved: () => void;
  onBack: () => void;
}

function brandKitFromState(
  state: WizardBrandState,
  base: BrandKit | null
): BrandKit {
  return {
    id: base?.id ?? "",
    workspace_id: base?.workspace_id ?? "",
    business_name: state.businessName || null,
    logo_path: state.logoPath,
    primary_color: state.primaryColor || null,
    secondary_color: state.secondaryColor || null,
    accent_color: state.accentColor || null,
    background_color: state.backgroundColor || null,
    text_color: state.textColor || null,
    arabic_font: state.arabicFont || null,
    english_font: state.englishFont || null,
    phone: state.phone || null,
    website: state.website || null,
    address: state.address || null,
    default_language: state.defaultLanguage,
    onboarding_step: base?.onboarding_step ?? 0,
    onboarding_completed_at: base?.onboarding_completed_at ?? null,
    created_at: base?.created_at ?? "",
    updated_at: base?.updated_at ?? "",
  };
}

function settingsFromState(
  state: WizardBrandState,
  base: WorkspaceIndustrySettings | null
): WorkspaceIndustrySettings {
  return {
    id: base?.id ?? "",
    workspace_id: base?.workspace_id ?? "",
    industry_key: state.industryKey,
    selected_services: state.services,
    created_at: base?.created_at ?? "",
    updated_at: base?.updated_at ?? "",
  };
}
