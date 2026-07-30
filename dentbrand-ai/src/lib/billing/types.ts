/**
 * Client-safe billing types and pure helpers. No server imports here so
 * client components can use these without pulling in `next/headers`.
 */

export interface Plan {
  id: string;
  key: string;
  name: string;
  price_month_cents: number;
  price_year_cents: number;
  currency: string;
  monthly_designs: number;
  monthly_image_credits: number;
  member_limit: number;
  paddle_price_id_month: string | null;
  paddle_price_id_year: string | null;
  sort_order: number;
}

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "canceled"
  | "expired";

export interface Subscription {
  id: string;
  workspace_id: string;
  plan_id: string | null;
  paddle_subscription_id: string | null;
  status: SubscriptionStatus;
  billing_period: "month" | "year";
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export function isSubscriptionActive(sub: Subscription | null): boolean {
  return !!sub && (sub.status === "active" || sub.status === "trialing");
}

export function formatPrice(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
