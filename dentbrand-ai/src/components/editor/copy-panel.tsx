"use client";

import { useState } from "react";

import { generateCopy, regenerateCopyField } from "@/lib/ai/actions";
import {
  COPY_TONES,
  type AiCopy,
  type CopyField,
  type CopyTone,
  type FieldMode,
} from "@/lib/ai/copy-schema";
import type { CopyGeneration } from "@/lib/ai/queries";
import { useEditorStore } from "@/stores/editor-store";
import type { ContentGoal, Service } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Copy fields that map onto design layers (by conventional layer id). */
const FIELD_TO_LAYER: Partial<Record<CopyField, string>> = {
  headlineOptions: "headline",
  bodyText: "body",
  ctaOptions: "cta",
};

interface CopyPanelProps {
  designId: string;
  services: Service[];
  goals: ContentGoal[];
  previousGenerations: CopyGeneration[];
}

export function CopyPanel({
  designId,
  services,
  goals,
  previousGenerations,
}: CopyPanelProps) {
  const layers = useEditorStore((s) => s.layers);
  const updateLayer = useEditorStore((s) => s.updateLayer);

  const [service, setService] = useState(services[0]?.label_en ?? "");
  const [goal, setGoal] = useState(goals[0]?.label_en ?? "");
  const [tone, setTone] = useState<CopyTone>("professional");
  const [offerDetails, setOfferDetails] = useState("");
  const [instructions, setInstructions] = useState("");

  const [busy, setBusy] = useState(false);
  const [busyField, setBusyField] = useState<CopyField | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Current + previous results — nothing is lost on regenerate.
  const [history, setHistory] = useState<AiCopy[]>(
    previousGenerations.map((g) => g.copy)
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const copy = history[activeIndex] ?? null;

  const applyToLayer = (field: CopyField, value: string) => {
    const layerId = FIELD_TO_LAYER[field];
    if (!layerId) return;
    const layer = layers.find((l) => l.id === layerId);
    if (!layer || layer.type !== "text" || !layer.editable) return;
    // Template character limits are respected on apply as a final guard.
    const clipped = layer.maxCharacters
      ? value.slice(0, layer.maxCharacters)
      : value;
    updateLayer(layerId, { text: clipped });
  };

  const canApply = (field: CopyField) => {
    const layerId = FIELD_TO_LAYER[field];
    if (!layerId) return false;
    const layer = layers.find((l) => l.id === layerId);
    return !!layer && layer.type === "text" && layer.editable;
  };

  const generate = async () => {
    setError(null);
    setBusy(true);
    const result = await generateCopy({
      designId,
      service,
      contentGoal: goal,
      tone,
      offerDetails: offerDetails || undefined,
      additionalInstructions: instructions || undefined,
    });
    setBusy(false);
    if (result.error || !result.copy) {
      setError(result.error ?? "Generation failed");
      return;
    }
    setHistory((prev) => [result.copy!, ...prev].slice(0, 10));
    setActiveIndex(0);
  };

  const regenField = async (field: CopyField, mode: FieldMode) => {
    if (!copy) return;
    setError(null);
    setBusyField(field);
    const current = copy[field];
    const result = await regenerateCopyField({
      designId,
      field,
      mode,
      currentValue: Array.isArray(current) ? current.join(" | ") : String(current),
      service,
      contentGoal: goal,
    });
    setBusyField(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    // Only the requested field changes; the previous pack stays in history.
    const updated = { ...copy, [field]: result.value } as AiCopy;
    setHistory((prev) => [updated, ...prev].slice(0, 10));
    setActiveIndex(0);
  };

  const copyCaption = async () => {
    if (!copy) return;
    const text = `${copy.caption}\n\n${copy.hashtags.join(" ")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy to clipboard");
    }
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <p className="text-sm font-semibold">AI copy</p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="ai-service">Service</Label>
            <select
              id="ai-service"
              className={selectClass}
              value={service}
              onChange={(e) => setService(e.target.value)}
            >
              {services.map((s) => (
                <option key={s.id} value={s.label_en}>
                  {s.label_en}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ai-goal">Goal</Label>
            <select
              id="ai-goal"
              className={selectClass}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            >
              {goals.map((g) => (
                <option key={g.key} value={g.label_en}>
                  {g.label_en}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="ai-tone">Tone</Label>
          <select
            id="ai-tone"
            className={selectClass}
            value={tone}
            onChange={(e) => setTone(e.target.value as CopyTone)}
          >
            {COPY_TONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="ai-offer">Offer details (optional — used exactly)</Label>
          <Input
            id="ai-offer"
            value={offerDetails}
            onChange={(e) => setOfferDetails(e.target.value)}
            placeholder="e.g. 20% off whitening in July"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="ai-notes">Extra instructions (optional)</Label>
          <Input
            id="ai-notes"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>

        <Button size="sm" onClick={generate} disabled={busy || !service || !goal}>
          {busy ? "Generating…" : copy ? "Generate again" : "Generate copy"}
        </Button>
      </div>

      {history.length > 1 && (
        <div className="space-y-1">
          <Label htmlFor="ai-history">Results ({history.length})</Label>
          <select
            id="ai-history"
            className={selectClass}
            value={activeIndex}
            onChange={(e) => setActiveIndex(Number(e.target.value))}
          >
            {history.map((_, index) => (
              <option key={index} value={index}>
                {index === 0 ? "Latest result" : `Previous result ${index}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {copy && (
        <div className="space-y-4 text-sm">
          <FieldBlock
            title="Headlines"
            busy={busyField === "headlineOptions"}
            actions={
              <>
                <MiniButton onClick={() => regenField("headlineOptions", "regenerate")}>
                  More
                </MiniButton>
                <MiniButton onClick={() => regenField("headlineOptions", "shorten")}>
                  Shorten
                </MiniButton>
              </>
            }
          >
            <ul className="space-y-1">
              {copy.headlineOptions.map((headline, i) => (
                <li key={i} className="flex items-start justify-between gap-2">
                  <span dir="auto">{headline}</span>
                  {canApply("headlineOptions") && (
                    <MiniButton
                      onClick={() => applyToLayer("headlineOptions", headline)}
                    >
                      Apply
                    </MiniButton>
                  )}
                </li>
              ))}
            </ul>
          </FieldBlock>

          <FieldBlock
            title="Body text"
            busy={busyField === "bodyText"}
            actions={
              <>
                <MiniButton onClick={() => regenField("bodyText", "shorten")}>
                  Shorten
                </MiniButton>
                <MiniButton onClick={() => regenField("bodyText", "rewrite")}>
                  Rewrite
                </MiniButton>
                <MiniButton onClick={() => regenField("bodyText", "professional")}>
                  Pro
                </MiniButton>
                <MiniButton onClick={() => regenField("bodyText", "friendly")}>
                  Friendly
                </MiniButton>
              </>
            }
          >
            <div className="flex items-start justify-between gap-2">
              <p dir="auto">{copy.bodyText}</p>
              {canApply("bodyText") && (
                <MiniButton onClick={() => applyToLayer("bodyText", copy.bodyText)}>
                  Apply
                </MiniButton>
              )}
            </div>
          </FieldBlock>

          <FieldBlock
            title="CTA options"
            busy={busyField === "ctaOptions"}
            actions={
              <MiniButton onClick={() => regenField("ctaOptions", "regenerate")}>
                More
              </MiniButton>
            }
          >
            <ul className="space-y-1">
              {copy.ctaOptions.map((cta, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span dir="auto">{cta}</span>
                  {canApply("ctaOptions") && (
                    <MiniButton onClick={() => applyToLayer("ctaOptions", cta)}>
                      Apply
                    </MiniButton>
                  )}
                </li>
              ))}
            </ul>
          </FieldBlock>

          <FieldBlock
            title="Caption & hashtags"
            busy={busyField === "caption"}
            actions={
              <>
                <MiniButton onClick={() => regenField("caption", "rewrite")}>
                  Rewrite
                </MiniButton>
                <MiniButton onClick={copyCaption}>
                  {copied ? "Copied!" : "Copy"}
                </MiniButton>
              </>
            }
          >
            <p dir="auto" className="whitespace-pre-wrap">
              {copy.caption}
            </p>
            <p dir="auto" className="mt-1 text-muted-foreground">
              {copy.hashtags.join(" ")}
            </p>
          </FieldBlock>

          {copy.medicalDisclaimerNeeded && (
            <p className="rounded bg-amber-100 px-2 py-1.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              ⚕️ Consider adding a medical disclaimer to this post.
            </p>
          )}

          <FieldBlock
            title="Image prompt (for AI images, next phase)"
            busy={busyField === "imagePrompt"}
            actions={
              <MiniButton onClick={() => regenField("imagePrompt", "regenerate")}>
                Regenerate
              </MiniButton>
            }
          >
            <p className="text-xs text-muted-foreground">{copy.imagePrompt}</p>
          </FieldBlock>
        </div>
      )}
    </div>
  );
}

function FieldBlock({
  title,
  busy,
  actions,
  children,
}: {
  title: string;
  busy: boolean;
  actions: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5 rounded-md border p-2.5", busy && "opacity-60")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          {title}
        </p>
        <div className="flex gap-1">{actions}</div>
      </div>
      {children}
    </div>
  );
}

function MiniButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-6 shrink-0 px-2 text-xs"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
