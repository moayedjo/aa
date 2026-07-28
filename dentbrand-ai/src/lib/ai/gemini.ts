import "server-only";

/**
 * Minimal Gemini REST client. Server-only: the API key never reaches the
 * browser, and errors are normalized so nothing sensitive leaks upward.
 */

const DEFAULT_MODEL = "gemini-2.0-flash";
const TIMEOUT_MS = 30_000;

export interface GeminiResult {
  ok: boolean;
  /** Raw text of the first candidate (expected to be JSON). */
  text?: string;
  error?: string;
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export async function generateJson(
  systemPrompt: string,
  userPrompt: string
): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "AI is not configured on this server" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel()}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.8,
            maxOutputTokens: 2048,
          },
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      // Never forward the provider's raw body — it can echo request data.
      return {
        ok: false,
        error: `AI request failed (${response.status}). Please try again.`,
      };
    }

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return { ok: false, error: "AI returned an empty response" };
    }
    return { ok: true, text };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "AI request timed out. Please try again." };
    }
    return { ok: false, error: "AI request failed. Please try again." };
  } finally {
    clearTimeout(timeout);
  }
}

/** Parses model output as JSON, tolerating stray markdown fences. */
export function parseJsonOutput(text: string): unknown | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
