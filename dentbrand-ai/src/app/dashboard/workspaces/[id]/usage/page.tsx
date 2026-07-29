import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getWorkspace } from "@/lib/workspaces/queries";
import {
  getCurrentUsage,
  getLedger,
  getWallet,
  isLowBalance,
  type LedgerEntry,
} from "@/lib/credits/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Usage & credits" };

const ENTRY_LABELS: Record<LedgerEntry["entry_type"], string> = {
  allowance: "Monthly allowance",
  reservation: "Image generation",
  refund: "Refund",
  adjustment: "Adjustment",
};

export default async function UsagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await getWorkspace(id);
  if (!workspace) notFound();

  const [wallet, ledger, usage] = await Promise.all([
    getWallet(id),
    getLedger(id),
    getCurrentUsage(id),
  ]);

  const low = isLowBalance(wallet);
  const refunds = ledger.filter((e) => e.entry_type === "refund");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/workspaces/${id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {workspace.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Usage &amp; credits</h1>
      </div>

      {low && (
        <Alert>
          <AlertDescription>
            You&apos;re running low on image credits ({wallet?.balance} left).
            They reset at the start of next month.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Image credits left"
          value={wallet ? `${wallet.balance}` : "—"}
          sub={wallet ? `of ${wallet.monthly_allowance} / month` : undefined}
        />
        <StatCard
          label="Images this month"
          value={`${usage?.images_generated ?? 0}`}
          sub={
            usage?.images_failed
              ? `${usage.images_failed} failed (refunded)`
              : "no failures"
          }
        />
        <StatCard
          label="Allowance period"
          value={wallet?.allowance_period ?? "—"}
          sub="resets monthly"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How credits work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Generating one AI image uses 1 image credit.</p>
          <p>
            A failed generation is automatically refunded — you are never
            charged for an image you didn&apos;t get.
          </p>
          <p>Credits reset to your monthly allowance at the start of each month.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity</CardTitle>
          <CardDescription>
            Every credit change, newest first. {refunds.length} refund
            {refunds.length === 1 ? "" : "s"} recorded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {ledger.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {ENTRY_LABELS[entry.entry_type]}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.reason ??
                        new Date(entry.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={
                        entry.amount >= 0
                          ? "font-medium text-emerald-600"
                          : "font-medium"
                      }
                    >
                      {entry.amount >= 0 ? "+" : ""}
                      {entry.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      balance {entry.balance_after}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
