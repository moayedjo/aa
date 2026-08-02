"use client";

import { useState } from "react";

import { createSupportRequest } from "@/lib/support/actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type Kind = "problem" | "help" | "feedback";

const KIND_LABELS: Record<Kind, string> = {
  problem: "Report a problem",
  help: "Get help",
  feedback: "Share feedback",
};

interface SupportWidgetProps {
  workspaceId: string;
  designId?: string;
  designName?: string;
}

/**
 * Non-blocking support entry point. Opens over the current screen without
 * navigating away, so it never interrupts the core workflow (spec §10).
 */
export function SupportWidget({
  workspaceId,
  designId,
  designName,
}: SupportWidgetProps) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("problem");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const submit = async () => {
    setBusy(true);
    setResult(null);
    const res = await createSupportRequest({
      workspaceId,
      designId,
      kind,
      message,
      context: {
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
        designName,
      },
    });
    setBusy(false);
    if (res.error) {
      setResult({ type: "error", text: res.error });
    } else {
      setResult({ type: "success", text: res.success ?? "Sent." });
      setMessage("");
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
      >
        Help
      </Button>

      {open && (
        <div className="absolute bottom-14 right-4 z-50 w-80 rounded-lg border bg-background p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">How can we help?</p>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          {result?.type === "success" ? (
            <Alert variant="success">
              <AlertDescription>{result.text}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {result?.type === "error" && (
                <Alert variant="destructive">
                  <AlertDescription>{result.text}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-1">
                {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={cn(
                      "flex-1 rounded border px-2 py-1 text-xs",
                      kind === k
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    {KIND_LABELS[k].split(" ")[0]}
                  </button>
                ))}
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder={
                  kind === "problem"
                    ? "What went wrong?"
                    : kind === "help"
                      ? "What do you need help with?"
                      : "Tell us what you think"
                }
                className="w-full rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />

              {designName && (
                <p className="text-xs text-muted-foreground">
                  We&apos;ll include this design ({designName}) so we can see
                  the context.
                </p>
              )}

              <Button
                size="sm"
                className="w-full"
                disabled={busy || message.trim().length < 3}
                onClick={submit}
              >
                {busy ? "Sending…" : "Send"}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
