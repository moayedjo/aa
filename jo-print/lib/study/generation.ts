/**
 * JO Study — generation orchestrator.
 * Calls the AI provider, validates structured output with Zod, retries once
 * on invalid output, and returns validated data + usage. Single AI entry point
 * for summaries, quizzes, flashcards, plans, and grounded chat.
 */
import type { z } from 'zod'
import {
  getAiProvider, parseJsonObject, AiInvalidOutputError,
  type AiUsage, type GenerateOptions,
} from './aiProvider'
import { AI_CONFIG } from './config'

export interface GenerationResult<T> {
  data: T
  usage: AiUsage
}

/**
 * Generate structured output validated against a Zod schema.
 * Retries once (AI_CONFIG.maxRetries) when the output fails validation.
 */
export async function generateStructured<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  opts: Omit<GenerateOptions, 'json'>,
): Promise<GenerationResult<z.infer<TSchema>>> {
  const provider = getAiProvider()
  let lastError: unknown
  const totalUsage: AiUsage = { inputTokens: 0, outputTokens: 0 }

  for (let attempt = 0; attempt <= AI_CONFIG.maxRetries; attempt++) {
    const result = await provider.generate({ ...opts, json: true })
    totalUsage.inputTokens += result.usage.inputTokens
    totalUsage.outputTokens += result.usage.outputTokens

    try {
      const parsed = parseJsonObject(result.text)
      const validated = schema.parse(parsed)
      return { data: validated, usage: totalUsage }
    } catch (err) {
      lastError = err
      // On retry, nudge the model to fix its output.
      opts = {
        ...opts,
        user: `${opts.user}\n\n(تنبيه: الرد السابق لم يكن JSON صالحاً مطابقاً للمخطط. أعد فقط JSON صالحاً.)`,
      }
    }
  }

  throw lastError instanceof Error
    ? new AiInvalidOutputError(lastError.message)
    : new AiInvalidOutputError()
}
