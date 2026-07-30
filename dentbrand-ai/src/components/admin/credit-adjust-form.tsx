"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { adjustCredits } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CreditAdjustForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const submit = async () => {
    setBusy(true);
    setResult(null);
    const res = await adjustCredits({
      workspaceId,
      amount: Number(amount),
      reason,
    });
    setBusy(false);
    if (res.error) setResult({ type: "error", text: res.error });
    else {
      setResult({ type: "success", text: res.success ?? "Done." });
      setAmount("");
      setReason("");
      router.refresh();
    }
  };

  return (
    <div className="space-y-3">
      {result && (
        <Alert variant={result.type === "error" ? "destructive" : "success"}>
          <AlertDescription>{result.text}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="amount">Amount (+/-)</Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 10 or -5"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="reason">Reason (audited)</Label>
          <Input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Goodwill credit"
          />
        </div>
      </div>
      <Button
        size="sm"
        disabled={busy || !amount || reason.trim().length < 3}
        onClick={submit}
      >
        {busy ? "Applying…" : "Adjust credits"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Every adjustment writes a ledger entry and an audit record.
      </p>
    </div>
  );
}
