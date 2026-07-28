"use client";

import { useTransition } from "react";

import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => signOut())}
    >
      {isPending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
