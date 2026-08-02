import type { Metadata } from "next";

import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "AI usage · Admin" };

export default async function AdminAiPage() {
  const admin = createAdminClient();

  const { data: recent } = await admin
    .from("ai_generations")
    .select("id, kind, status, language, model, duration_ms, error, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">AI usage</h1>
      <p className="text-sm text-muted-foreground">
        Most recent 50 generations. Failures show their reason so AI issues
        are visible.
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left">
            <tr>
              <th className="p-3 font-medium">When</th>
              <th className="p-3 font-medium">Kind</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Lang</th>
              <th className="p-3 font-medium">ms</th>
              <th className="p-3 font-medium">Error</th>
            </tr>
          </thead>
          <tbody>
            {(recent ?? []).map((g) => (
              <tr key={g.id} className="border-t">
                <td className="p-3 text-muted-foreground">
                  {new Date(g.created_at).toLocaleString()}
                </td>
                <td className="p-3">{g.kind}</td>
                <td className="p-3">
                  <span
                    className={
                      g.status === "failed"
                        ? "font-medium text-destructive"
                        : g.status === "completed"
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                    }
                  >
                    {g.status}
                  </span>
                </td>
                <td className="p-3">{g.language}</td>
                <td className="p-3">{g.duration_ms ?? "—"}</td>
                <td className="max-w-xs truncate p-3 text-xs text-muted-foreground">
                  {g.error ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
