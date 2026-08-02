"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createDesignVersion,
  restoreDesignVersion,
} from "@/lib/designs/actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface VersionSummary {
  id: string;
  version: number;
  kind: "checkpoint" | "manual" | "pre-restore";
  created_at: string;
}

const KIND_LABELS: Record<VersionSummary["kind"], string> = {
  checkpoint: "Autosave checkpoint",
  manual: "Saved version",
  "pre-restore": "Before restore",
};

export function HistoryPanel({
  designId,
  versions,
}: {
  designId: string;
  versions: VersionSummary[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const saveVersion = () =>
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await createDesignVersion(designId, "manual");
      if (result?.error) setError(result.error);
      else {
        setNotice("Version saved");
        router.refresh();
      }
    });

  const restore = (version: number) =>
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await restoreDesignVersion(designId, version);
      if (result?.error) setError(result.error);
      else {
        setNotice(`Restored version ${version}`);
        // The page re-renders with the restored design and re-initializes
        // the editor state.
        router.refresh();
      }
    });

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Version history</p>
        <Button
          size="sm"
          variant="outline"
          onClick={saveVersion}
          disabled={isPending}
        >
          Save version
        </Button>
      </div>

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

      {versions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No versions yet. Versions are created automatically as you work,
          and whenever you press &ldquo;Save version&rdquo;.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {versions.map((version) => (
            <li
              key={version.id}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="min-w-0">
                <span className="font-medium">v{version.version}</span>{" "}
                <span className="text-muted-foreground">
                  · {KIND_LABELS[version.kind]} ·{" "}
                  {new Date(version.created_at).toLocaleString()}
                </span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 shrink-0 px-2 text-xs"
                onClick={() => restore(version.version)}
                disabled={isPending}
              >
                Restore
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
