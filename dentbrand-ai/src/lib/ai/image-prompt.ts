/**
 * Image Prompt Builder. The user (or AI copy) supplies the scene; the
 * composition and safety rules are appended server-side on every request
 * and can never be removed by the client.
 */

const COMPOSITION_RULES =
  "Professional commercial photography, photorealistic, soft natural light, " +
  "suitable for a dental clinic's social media. " +
  "Strictly NO text, NO words, NO letters, NO numbers, NO logos, NO watermarks. " +
  "No graphic medical procedures, no blood, no before-and-after comparisons. " +
  "Vertical 4:5 portrait composition with generous clean negative space " +
  "(top or side) left intentionally empty for a text overlay.";

export const MAX_IMAGE_PROMPT_CHARS = 1000;

export function buildImagePrompt(userScene: string): string {
  const scene = userScene.trim().slice(0, MAX_IMAGE_PROMPT_CHARS);
  return `${scene}\n\n${COMPOSITION_RULES}`;
}
