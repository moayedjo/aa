import "server-only";

/**
 * Minimal Gemini REST client. Server-only: the API key never reaches the
 * browser, and errors are normalized so nothing sensitive leaks upward.
 */

const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_IMAGE_MODEL = "gemini-2.0-flash-preview-image-generation";
const TIMEOUT_MS = 30_000;
const IMAGE_TIMEOUT_MS = 60_000;

export interface GeminiResult {
  ok: boolean;
  /** Raw text of the first candidate (expected to be JSON). */
  text?: string;
  error?: string;
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export function geminiImageModel(): string {
  return process.env.GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
}

export interface GeminiImageResult {
  ok: boolean;
  /** Base64-encoded image bytes. */
  base64?: string;
  mimeType?: string;
  error?: string;
}

/** Generates one image; the caller must store it before any canvas use. */
export async function generateImage(prompt: string): Promise<GeminiImageResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "AI is not configured on this server" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiImageModel()}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      return {
        ok: false,
        error: `Image generation failed (${response.status}). Please try again.`,
      };
    }

    const payload = (await response.json()) as {
      candidates?: {
        content?: {
          parts?: { inlineData?: { mimeType?: string; data?: string } }[];
        };
      }[];
    };
    const imagePart = payload.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData?.data
    );
    if (!imagePart?.inlineData?.data) {
      return { ok: false, error: "The model returned no image. Please try again." };
    }
    return {
      ok: true,
      base64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType ?? "image/png",
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "Image generation timed out. Please try again." };
    }
    return { ok: false, error: "Image generation failed. Please try again." };
  } finally {
    clearTimeout(timeout);
  }
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
