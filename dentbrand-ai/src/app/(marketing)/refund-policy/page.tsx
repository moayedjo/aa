import type { Metadata } from "next";

export const metadata: Metadata = { title: "Refund Policy" };

export default function RefundPolicyPage() {
  return (
    <article className="space-y-4">
      <h1 className="text-2xl font-bold">Refund Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: 2026-07-30</p>

      <p>
        This is a template to be reviewed by your legal counsel and reconciled
        with your payment provider&apos;s (Paddle) terms before launch.
      </p>

      <h2 className="text-lg font-semibold">Subscriptions</h2>
      <p>
        You can cancel your subscription at any time from the billing page.
        Cancellation stops the next renewal; you keep access until the end of
        the current paid period. We do not automatically pro-rate partial
        months, but you may contact us within 14 days of a charge to request a
        review.
      </p>

      <h2 className="text-lg font-semibold">Image credits</h2>
      <p>
        A failed AI image generation is never charged — the reserved credit is
        automatically refunded to your wallet, and every refund is visible on
        your usage page. Consumed credits for successful generations are
        non-refundable.
      </p>

      <h2 className="text-lg font-semibold">How to request a refund</h2>
      <p>
        Email billing@your-domain.example with your workspace name and the
        charge in question. We respond within a few business days.
      </p>
    </article>
  );
}
