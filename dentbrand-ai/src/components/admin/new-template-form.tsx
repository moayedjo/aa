"use client";

import { useState } from "react";

import { createTemplate } from "@/lib/templates/admin-actions";
import type { IndustryVertical, TemplateCategory } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const STARTER_JSON = `{
  "schemaVersion": 1,
  "canvas": { "width": 1080, "height": 1350, "backgroundColor": "{{backgroundColor}}" },
  "supportedLanguages": ["ar", "en"],
  "layers": [
    { "id": "headline", "type": "text", "x": 60, "y": 120, "width": 960, "height": 200,
      "zIndex": 1, "editable": true, "text": "{{headline}}", "fontFamily": "{{brandFont}}",
      "fontSize": 72, "fontWeight": 800, "direction": "auto", "align": "start",
      "fill": "{{primaryColor}}", "maxCharacters": 60 }
  ]
}`;

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function NewTemplateForm({
  verticals,
  categories,
}: {
  verticals: IndustryVertical[];
  categories: TemplateCategory[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [verticalId, setVerticalId] = useState(verticals[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [json, setJson] = useState(STARTER_JSON);

  const submit = async () => {
    setError(null);
    setSaving(true);
    // Redirects to the editor on success; returns only on failure.
    const result = await createTemplate({
      verticalId,
      name,
      description: description || undefined,
      categoryId: categoryId || null,
      templateJson: json,
    });
    setSaving(false);
    if (result?.error) setError(result.error);
  };

  const verticalCategories = categories.filter(
    (c) => c.vertical_id === verticalId
  );

  return (
    <div className="max-w-3xl space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vertical">Vertical</Label>
          <select
            id="vertical"
            className={selectClass}
            value={verticalId}
            onChange={(e) => {
              setVerticalId(e.target.value);
              setCategoryId("");
            }}
          >
            {verticals.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label_en}
              </option>
            ))}
          </select>
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
            {verticalCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label_en}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="json">Template JSON (schemaVersion 1)</Label>
        <textarea
          id="json"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={18}
          spellCheck={false}
          className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Validated with Zod on save. New templates start as drafts.
        </p>
      </div>

      <Button onClick={submit} disabled={saving || !name || !verticalId}>
        {saving ? "Creating…" : "Create template"}
      </Button>
    </div>
  );
}
