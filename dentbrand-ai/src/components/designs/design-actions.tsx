"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteDesignForever,
  duplicateDesign,
  restoreDesignFromTrash,
  trashDesign,
} from "@/lib/designs/actions";
import { Button } from "@/components/ui/button";

interface DesignActionsProps {
  designId: string;
  inTrash: boolean;
  canDeleteForever: boolean;
}

export function DesignActions({
  designId,
  inTrash,
  canDeleteForever,
}: DesignActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result?.error) setError(result.error);
      else router.refresh();
    });

  return (
    <div className="flex items-center gap-1.5">
      {error && <span className="text-xs text-destructive">{error}</span>}
      {inTrash ? (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => run(() => restoreDesignFromTrash(designId))}
          >
            Restore
          </Button>
          {canDeleteForever && (
            <Button
              size="sm"
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (
                  window.confirm(
                    "Delete this design forever? This cannot be undone."
                  )
                ) {
                  run(() => deleteDesignForever(designId));
                }
              }}
            >
              Delete forever
            </Button>
          )}
        </>
      ) : (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => run(() => duplicateDesign(designId))}
          >
            Duplicate
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => run(() => trashDesign(designId))}
          >
            Trash
          </Button>
        </>
      )}
    </div>
  );
}
