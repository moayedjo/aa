import "server-only";

/**
 * Product analytics abstraction.
 *
 * Phase 02 emits structured server-side logs only; the PostHog transport
 * arrives with the full analytics setup in Phase 11 and plugs in here
 * without touching call sites. Never log secrets or free-text user content.
 */

export type AnalyticsEvent =
  | "onboarding_started"
  | "onboarding_step_completed"
  | "onboarding_logo_uploaded"
  | "onboarding_completed";

export interface AnalyticsProps {
  workspaceId?: string;
  userId?: string;
  step?: string;
  [key: string]: string | number | boolean | undefined;
}

export function trackEvent(event: AnalyticsEvent, props: AnalyticsProps): void {
  console.log(
    JSON.stringify({
      type: "analytics",
      event,
      props,
      ts: new Date().toISOString(),
    })
  );
}
