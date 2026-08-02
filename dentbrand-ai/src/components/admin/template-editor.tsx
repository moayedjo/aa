"use client";

import { useMemo, useState } from "react";

import {
  saveTemplateVersion,
  updateTemplateMeta,
  updateTemplateStatus,
} from "@/lib/templates/admin-actions";
import { validateTemplateJson } from "@/lib/templates/schema";
import {
  buildResolveContext,
  resolveTemplate,
  type RenderLanguage,
} from "@/lib/templates/resolve";
import { TemplatePreview } from "@/components/templates/template-preview";
import type {
  Service,
  Template,
  TemplateCategory,
  TemplateStatus,
  TemplateVersion,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const NEXT_STATUSES: Record<TemplateStatus, TemplateStatus[]> = {
  draft: ["testing"],
  testing: ["draft", "approved"],
  approved: ["testing", "published"],
  published: ["archived"],
  archived: ["draft"],
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface TemplateEditorProps {
  template: Template;
  currentJson: unknown;
  versions: TemplateVersion[];
  categories: TemplateCategory[];
  services: Service[];
  linkedServiceIds: string[];
}

export function TemplateEditor({
  template,
  currentJson,
  versions,
  categories,
  services,
  linkedServiceIds,
}: TemplateEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [categoryId, setCategoryId] = useState(template.category_id ?? "");
  const [serviceIds, setServiceIds] = useState<string[]>(linkedServiceIds);
  const [jsonText, setJsonText] = useState(
    JSON.stringify(currentJson, null, 2)
  );
  const [previewLanguage, setPreviewLanguage] = useState<RenderLanguage>("en");

  // Live preview straight from the textarea — invalid JSON shows the error
  // instead of a stale preview.
  const preview = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(jsonText);
      const validated = validateTemplateJson(parsed);
      if (!validated.ok) return { error: validated.error };
      const ctx = buildResolveContext(null, null, previewLanguage);
      return { resolved: resolveTemplate(validated.template, ctx) };
    } catch {
      return { error: "Not valid JSON" };
    }
  }, [jsonText, previewLanguage]);

  const run = async (fn: () => Promise<{ error?: string }>, done: string) => {
    setError(null);
    setNotice(null);
    setBusy(true);
    const result = await fn();
    setBusy(false);
    if (result?.error) setError(result.error);
    else setNotice(done);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {notice && (
          <Alert variant="success">
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Status:{" "}
              <span className="font-mono text-sm">{template.status}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {NEXT_STATUSES[template.status].map((next) => (
              <Button
                key={next}
                variant={next === "published" ? "default" : "outline"}
                size="sm"
                disabled={busy}
                onClick={() =>
                  run(
                    () => updateTemplateStatus(template.id, next),
                    `Status changed to ${next}`
                  )
                }
              >
                Move to {next}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className={selectClass}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label_en}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Linked services</legend>
              <div className="flex flex-wrap gap-2">
                {services.map((service) => {
                  const active = serviceIds.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setServiceIds((prev) =>
                          active
                            ? prev.filter((idValue) => idValue !== service.id)
                            : [...prev, service.id]
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      )}
                    >
                      {service.label_en}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                run(
                  () =>
                    updateTemplateMeta(template.id, {
                      name,
                      description: description || undefined,
                      categoryId: categoryId || null,
                      serviceIds,
                    }),
                  "Metadata saved"
                )
              }
            >
              Save metadata
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Template JSON — current v{template.current_version}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={22}
              spellCheck={false}
              aria-label="Template JSON"
              className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Saving creates immutable version v{template.current_version + 1};
              existing versions are never modified.
            </p>
            <Button
              size="sm"
              disabled={busy || !!preview.error}
              onClick={() =>
                run(
                  () => saveTemplateVersion(template.id, jsonText),
                  `Saved as v${template.current_version + 1}`
                )
              }
            >
              Save as new version
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Version history</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {versions.map((version) => (
                <li key={version.id} className="flex justify-between">
                  <span>
                    v{version.version}
                    {version.version === template.current_version && (
                      <span className="ml-2 rounded bg-emerald-100 px-1.5 text-xs text-emerald-900">
                        current
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(version.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Preview (sample brand)
          </p>
          <div className="flex gap-1 rounded-md border p-0.5 text-xs">
            {(["en", "ar"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setPreviewLanguage(lang)}
                className={cn(
                  "rounded px-2 py-1",
                  previewLanguage === lang
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                {lang === "en" ? "EN" : "ع"}
              </button>
            ))}
          </div>
        </div>
        {preview.error ? (
          <Alert variant="destructive">
            <AlertDescription>{preview.error}</AlertDescription>
          </Alert>
        ) : preview.resolved ? (
          <TemplatePreview
            resolved={preview.resolved}
            className="w-full rounded-lg border"
          />
        ) : null}
      </aside>
    </div>
  );
}
