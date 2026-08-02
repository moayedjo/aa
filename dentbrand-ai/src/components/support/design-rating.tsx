"use client";

import { useState } from "react";

import { rateDesign } from "@/lib/support/actions";
import { cn } from "@/lib/utils";

interface DesignRatingProps {
  designId: string;
  workspaceId: string;
  initialRating: number | null;
}

/**
 * Lightweight satisfaction rating (1–5). Inline and optional — it never
 * blocks the workflow; submitting or ignoring it both keep the editor
 * fully usable.
 */
export function DesignRating({
  designId,
  workspaceId,
  initialRating,
}: DesignRatingProps) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [hover, setHover] = useState<number | null>(null);
  const [saved, setSaved] = useState(initialRating !== null);

  const choose = async (value: number) => {
    setRating(value);
    setSaved(false);
    const result = await rateDesign({ designId, workspaceId, rating: value });
    if (!result.error) setSaved(true);
  };

  const shown = hover ?? rating ?? 0;

  return (
    <div className="flex items-center gap-2 border-t pt-3">
      <span className="text-xs text-muted-foreground">Rate this design:</span>
      <div className="flex" role="radiogroup" aria-label="Design rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(null)}
            onClick={() => choose(star)}
            className={cn(
              "px-0.5 text-lg leading-none transition-colors",
              star <= shown ? "text-amber-500" : "text-muted-foreground/40"
            )}
          >
            ★
          </button>
        ))}
      </div>
      {saved && rating !== null && (
        <span className="text-xs text-emerald-600">Thanks!</span>
      )}
    </div>
  );
}
