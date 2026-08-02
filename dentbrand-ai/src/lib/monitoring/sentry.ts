import "server-only";

/**
 * Minimal, dependency-free error reporter. When `SENTRY_DSN` is set it
 * POSTs a Sentry "store" event; otherwise it logs a structured error.
 * Kept behind this seam so a full `@sentry/nextjs` integration can replace
 * the body later without touching call sites.
 */

interface DsnParts {
  storeUrl: string;
  publicKey: string;
}

function parseDsn(dsn: string): DsnParts | null {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/\//g, "");
    const storeUrl = `${url.protocol}//${url.host}/api/${projectId}/store/`;
    return { storeUrl, publicKey: url.username };
  } catch {
    return null;
  }
}

export function reportError(
  error: unknown,
  context?: Record<string, string | number | boolean | undefined>
): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify({ type: "error", message, context, ts: new Date().toISOString() })
  );

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  const parsed = parseDsn(dsn);
  if (!parsed) return;

  // Fire-and-forget; never let error reporting break the request.
  void fetch(parsed.storeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=dentbrand/1.0`,
    },
    body: JSON.stringify({
      message,
      level: "error",
      platform: "node",
      timestamp: Date.now() / 1000,
      extra: context ?? {},
      exception: {
        values: [
          {
            type: error instanceof Error ? error.name : "Error",
            value: message,
          },
        ],
      },
    }),
  }).catch(() => {
    // Swallow — the structured log above is the durable record.
  });
}
