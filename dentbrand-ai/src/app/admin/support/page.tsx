import type { Metadata } from "next";

import { getSupportTickets } from "@/lib/admin/queries";
import { CloseTicketButton } from "@/components/admin/close-ticket-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Support · Admin" };

export default async function AdminSupportPage() {
  const tickets = await getSupportTickets("open");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Support tickets</h1>
      <p className="text-sm text-muted-foreground">
        {tickets.length} open ticket{tickets.length === 1 ? "" : "s"}.
      </p>

      {tickets.length === 0 ? (
        <p className="text-muted-foreground">No open tickets. 🎉</p>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base capitalize">
                    {t.kind}
                  </CardTitle>
                  <CloseTicketButton ticketId={t.id} />
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>{t.message}</p>
                <p className="text-xs text-muted-foreground">
                  Workspace {t.workspace_id.slice(0, 8)} ·{" "}
                  {t.design_id ? `design ${t.design_id.slice(0, 8)} · ` : ""}
                  {new Date(t.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
