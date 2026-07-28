"use client";

import { useMemo, useState } from "react";

import { createDesign } from "@/lib/designs/actions";
import type { ResolvedTemplate } from "@/lib/templates/resolve";
import type { ContentGoal, Service } from "@/types/database";
import { TemplatePreview } from "@/components/templates/template-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface TemplateCard {
  id: string;
  name: string;
  description: string | null;
  supportedLanguages: string[];
  serviceIds: string[];
  resolved: ResolvedTemplate;
}

interface CreateFlowProps {
  workspaceId: string;
  services: Service[];
  goals: ContentGoal[];
  templates: TemplateCard[];
  /** Service keys chosen during onboarding — shown first. */
  selectedServiceKeys: string[];
  defaultLanguage: "ar" | "en";
}

export function CreateFlow({
  workspaceId,
  services,
  goals,
  templates,
  selectedServiceKeys,
  defaultLanguage,
}: CreateFlowProps) {
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [goalKey, setGoalKey] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [language, setLanguage] = useState<"ar" | "en">(defaultLanguage);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Workspace's own services first, then the rest of the catalog.
  const orderedServices = useMemo(() => {
    const mine = services.filter((s) => selectedServiceKeys.includes(s.key));
    const rest = services.filter((s) => !selectedServiceKeys.includes(s.key));
    return [...mine, ...rest];
  }, [services, selectedServiceKeys]);

  // Templates linked to the chosen service float to the top; templates
  // without service links stay available for every service.
  const orderedTemplates = useMemo(() => {
    if (!serviceId) return templates;
    const matching = templates.filter(
      (t) => t.serviceIds.length === 0 || t.serviceIds.includes(serviceId)
    );
    const others = templates.filter(
      (t) => t.serviceIds.length > 0 && !t.serviceIds.includes(serviceId)
    );
    return [...matching, ...others];
  }, [templates, serviceId]);

  const selectedService = services.find((s) => s.id === serviceId);
  const selectedGoal = goals.find((g) => g.key === goalKey);

  const submit = async () => {
    if (!templateId) return;
    setError(null);
    setCreating(true);
    // Redirects into the editor on success; returns only on failure.
    const result = await createDesign({
      workspaceId,
      templateId,
      language,
      name:
        name.trim() ||
        [selectedService?.label_en, selectedGoal?.label_en]
          .filter(Boolean)
          .join(" · ") ||
        "Untitled design",
    });
    setCreating(false);
    if (result?.error) setError(result.error);
  };

  return (
    <div className="space-y-8">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">1. Which service is this about?</h2>
        <div className="flex flex-wrap gap-2">
          {orderedServices.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => setServiceId(service.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                serviceId === service.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
            >
              {service.label_en}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">2. What is the goal?</h2>
        <div className="flex flex-wrap gap-2">
          {goals.map((goal) => (
            <button
              key={goal.key}
              type="button"
              onClick={() => setGoalKey(goal.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                goalKey === goal.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
            >
              {goal.label_en}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">3. Pick a template</h2>
          <div className="flex gap-1 rounded-md border p-0.5 text-xs">
            {(["en", "ar"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={cn(
                  "rounded px-2 py-1",
                  language === lang
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                {lang === "en" ? "English" : "العربية"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orderedTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setTemplateId(template.id)}
              className="text-start"
            >
              <Card
                className={cn(
                  "overflow-hidden transition-shadow",
                  templateId === template.id && "ring-2 ring-primary"
                )}
              >
                <TemplatePreview
                  resolved={template.resolved}
                  className="w-full border-b"
                />
                <CardContent className="p-3">
                  <p className="text-sm font-medium">{template.name}</p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-md space-y-3">
        <h2 className="text-sm font-semibold">4. Name it and start editing</h2>
        <div className="space-y-2">
          <Label htmlFor="design-name">Design name</Label>
          <Input
            id="design-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              [selectedService?.label_en, selectedGoal?.label_en]
                .filter(Boolean)
                .join(" · ") || "e.g. Whitening promo"
            }
          />
        </div>
        <Button onClick={submit} disabled={!templateId || creating}>
          {creating ? "Creating…" : "Create design"}
        </Button>
        {!templateId && (
          <p className="text-xs text-muted-foreground">
            Choose a template to continue.
          </p>
        )}
      </section>
    </div>
  );
}
