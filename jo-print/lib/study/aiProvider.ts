/**
 * JO Study — provider-agnostic AI abstraction.
 * Server-only. The API key is never exposed to the client.
 *
 * Default implementation: OpenAI. A Gemini/other provider can be added by
 * implementing AiProvider and wiring it into getAiProvider().
 */
import OpenAI from 'openai'
import { AI_CONFIG, isAiConfigured } from './config'

export class AiNotConfiguredError extends Error {
  constructor() {
    super('AI provider is not configured')
    this.name = 'AiNotConfiguredError'
  }
}

export class AiInvalidOutputError extends Error {
  constructor(message = 'AI returned invalid structured output') {
    super(message)
    this.name = 'AiInvalidOutputError'
  }
}

export interface AiUsage {
  inputTokens: number
  outputTokens: number
}

export interface AiTextResult {
  text: string
  usage: AiUsage
}

export interface GenerateOptions {
  system: string
  user: string
  /** Provider file ids to ground the answer in (file search / retrieval). */
  fileIds?: string[]
  vectorStoreId?: string
  /** Force JSON object output. */
  json?: boolean
  temperature?: number
}

export interface AiProvider {
  readonly model: string
  generate(opts: GenerateOptions): Promise<AiTextResult>
  /** Upload a file to the provider for retrieval; returns the provider file id. */
  uploadFile?(bytes: Uint8Array, filename: string, mimeType: string): Promise<string>
}

// ── OpenAI implementation ─────────────────────────────────────────────────────
class OpenAiProvider implements AiProvider {
  readonly model = AI_CONFIG.model
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async generate(opts: GenerateOptions): Promise<AiTextResult> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: opts.temperature ?? 0.2,
      response_format: opts.json ? { type: 'json_object' } : undefined,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
    })

    const text = completion.choices[0]?.message?.content ?? ''
    return {
      text,
      usage: {
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
      },
    }
  }

  async uploadFile(bytes: Uint8Array, filename: string, mimeType: string): Promise<string> {
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType })
    const file = new File([blob], filename, { type: mimeType })
    const uploaded = await this.client.files.create({ file, purpose: 'assistants' })
    return uploaded.id
  }
}

let cached: AiProvider | null = null

/**
 * Returns the configured AI provider, or throws AiNotConfiguredError.
 * Callers should catch AiNotConfiguredError and surface a clear user message.
 */
export function getAiProvider(): AiProvider {
  if (!isAiConfigured()) throw new AiNotConfiguredError()
  if (!cached) cached = new OpenAiProvider(process.env.OPENAI_API_KEY as string)
  return cached
}

export function estimateCost(usage: AiUsage): number {
  const input = (usage.inputTokens / 1000) * AI_CONFIG.inputCostPer1K
  const output = (usage.outputTokens / 1000) * AI_CONFIG.outputCostPer1K
  return Math.round((input + output) * 1e6) / 1e6
}

/**
 * Parse a JSON object from model text output, tolerating code fences.
 * Throws AiInvalidOutputError if no valid JSON object is found.
 */
export function parseJsonObject(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const start = fenced.indexOf('{')
  const end = fenced.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new AiInvalidOutputError('no JSON object in output')
  }
  try {
    return JSON.parse(fenced.slice(start, end + 1))
  } catch {
    throw new AiInvalidOutputError('output is not valid JSON')
  }
}
