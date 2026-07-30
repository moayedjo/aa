"use client";

/**
 * Client-side Paddle.js loader + checkout opener. Paddle.js is fetched
 * from Paddle's CDN on demand; if the token isn't configured or the script
 * can't load, we fail gracefully (the redirect never activates anything —
 * the webhook does).
 */

interface PaddleGlobal {
  Environment?: { set: (env: string) => void };
  Initialize: (opts: { token: string }) => void;
  Checkout: { open: (opts: { transactionId: string }) => void };
}

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

let loadPromise: Promise<boolean> | null = null;

function loadPaddleJs(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Paddle) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return loadPromise;
}

export async function openPaddleCheckout(
  transactionId: string
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token) {
    return { ok: false, error: "Checkout is not configured." };
  }

  const loaded = await loadPaddleJs();
  if (!loaded || !window.Paddle) {
    return { ok: false, error: "Could not load the checkout." };
  }

  try {
    if (
      process.env.NEXT_PUBLIC_PADDLE_ENV &&
      process.env.NEXT_PUBLIC_PADDLE_ENV !== "production"
    ) {
      window.Paddle.Environment?.set(process.env.NEXT_PUBLIC_PADDLE_ENV);
    }
    window.Paddle.Initialize({ token });
    window.Paddle.Checkout.open({ transactionId });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not open the checkout." };
  }
}
