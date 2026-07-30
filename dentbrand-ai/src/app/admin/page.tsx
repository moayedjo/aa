import type { Metadata } from "next";

import { getAdminKpis, getTemplatePerformance } from "@/lib/admin/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Overview · Admin" };

export default async function AdminOverviewPage() {
  const [kpis, templates] = await Promise.all([
    getAdminKpis(),
    getTemplatePerformance(),
  ]);

  const pct = (v: number | null) =>
    v === null ? "—" : `${Math.round(v * 100)}%`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>

      <section className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Users" value={kpis.users} />
        <Stat label="Workspaces" value={kpis.workspaces} />
        <Stat label="Active subscriptions" value={kpis.activeSubscriptions} />
        <Stat label="Designs" value={kpis.designs} />
        <Stat label="Exports" value={kpis.exportsTotal} />
        <Stat label="Export success" value={pct(kpis.exportSuccessRate)} />
        <Stat
          label="AI failures (copy / image)"
          value={`${kpis.aiCopyFailures} / ${kpis.aiImageFailures}`}
        />
        <Stat label="Credit refunds" value={kpis.creditRefunds} />
        <Stat
          label="Avg design rating"
          value={kpis.avgRating === null ? "—" : kpis.avgRating.toFixed(1)}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Template performance</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="p-2 font-medium">Template</th>
                    <th className="p-2 font-medium">Designs</th>
                    <th className="p-2 font-medium">Exports</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.templateId} className="border-t">
                      <td className="p-2">{t.name}</td>
                      <td className="p-2">{t.designs}</td>
                      <td className="p-2">{t.exports}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
