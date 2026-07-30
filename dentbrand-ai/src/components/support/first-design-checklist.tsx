import Link from "next/link";

import type { FirstDesignChecklist } from "@/lib/support/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  workspaceId: string;
  checklist: FirstDesignChecklist;
  canEditBrand: boolean;
  canCreate: boolean;
}

/**
 * Activation nudge shown until the workspace has completed the core
 * journey (brand → design → export). Hides itself once all three are done
 * so it never nags an established workspace.
 */
export function FirstDesignChecklistCard({
  workspaceId,
  checklist,
  canEditBrand,
  canCreate,
}: Props) {
  const done =
    checklist.brandComplete &&
    checklist.designCreated &&
    checklist.designExported;
  if (done) return null;

  const items = [
    {
      label: "Complete your Brand Kit",
      done: checklist.brandComplete,
      href: canEditBrand ? `/onboarding/${workspaceId}` : null,
      cta: "Finish brand",
    },
    {
      label: "Create your first design",
      done: checklist.designCreated,
      href: canCreate ? `/dashboard/workspaces/${workspaceId}/create` : null,
      cta: "Create design",
    },
    {
      label: "Export your first design",
      done: checklist.designExported,
      href: null,
      cta: null,
    },
  ];
  const nextItem = items.find((i) => !i.done && i.href);

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-lg">Get started</CardTitle>
        <CardDescription>
          Three quick steps to your first published design.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border text-xs",
                  item.done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-muted-foreground/40 text-transparent"
                )}
              >
                ✓
              </span>
              <span className={cn(item.done && "text-muted-foreground line-through")}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
        {nextItem?.href && (
          <Link
            href={nextItem.href}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            {nextItem.cta}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
