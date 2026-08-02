"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { closeSupportTicket } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";

export function CloseTicketButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await closeSupportTicket({ ticketId });
          router.refresh();
        })
      }
    >
      {isPending ? "Closing…" : "Close"}
    </Button>
  );
}
