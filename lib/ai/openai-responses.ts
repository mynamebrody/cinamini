/**
 * Shared OpenAI Responses API wrapper.
 *
 * Used by:
 *   - lib/puzzle-generator/* (smart puzzle generation for issue #55)
 *   - app/api/admin/movies/fun-facts/route.ts
 *
 * Two entry points:
 *
 *   generateStructured  — blocks until the full response is ready, parses +
 *                         validates the output text against a Zod schema.
 *   streamStructured    — yields progress events (text-delta, tool-call,
 *                         final) as the model produces them, and still
 *                         validates the final text against the Zod schema.
 *
 * Shared behaviour:
 *   - model resolved via `resolveModelId()` (env `OPENAI_PUZZLE_MODEL`,
 *     default `gpt-5-mini`).
 *   - `includeWebSearch` defaults to FALSE. Callers opt in when grounding is
 *     important (fun facts with citations, or the admin's "Grounded" toggle).
 *   - `abortSignal` is threaded end-to-end so an upstream AbortController can
 *     cancel the OpenAI HTTP request and stop token billing.
 *
 * Keeping this helper framework-agnostic (no admin auth / no database access)
 * means it can be imported from any server-side context.
 */

import { openai } from '@ai-sdk/openai'
import {
  generateText,
  stepCountIs,
  streamText,
  type ToolSet,
} from 'ai'
import type { z } from 'zod'

export const DEFAULT_PUZZLE_MODEL = 'gpt-5-mini'

/**
 * Resolve the model id for a generation call.
 *
 * Precedence:
 *   1. explicit override passed by the caller
 *   2. OPENAI_PUZZLE_MODEL env var
 *   3. DEFAULT_PUZZLE_MODEL (gpt-5-mini)
 */
export function resolveModelId(override?: string): string {
  return override || process.env.OPENAI_PUZZLE_MODEL || DEFAULT_PUZZLE_MODEL
}

export interface GenerateStructuredOptions<T> {
  /** Zod schema the parsed JSON must satisfy. */
  schema: z.ZodType<T>
  /** Optional system prompt. */
  system?: string
  /** User prompt. Required. */
  prompt: string
  /** Optional explicit model id; otherwise resolved from env. */
  modelId?: string
  /**
   * Enable OpenAI's hosted `web_search` tool. Defaults to FALSE — callers
   * opt in when they actually need fresh citations.
   */
  includeWebSearch?: boolean
  /**
   * Maximum number of reasoning/tool steps the model can take before being
   * forced to finalize. Default is 2: one optional tool call followed by a
   * final answer. Raise it only when the prompt truly needs multi-step
   * browsing.
   */
  maxSteps?: number
  /**
   * Optional AbortSignal. Aborting closes the underlying OpenAI HTTP
   * connection; no further tokens are billed after that point.
   */
  abortSignal?: AbortSignal
}

export interface StructuredUsage {
  tokensIn?: number
  tokensOut?: number
}

export interface GenerateStructuredResult<T> {
  object: T
  rawText: string
  usage: StructuredUsage
  modelId: string
  /** Number of tool calls made (web_search etc.). Helpful for logging. */
  toolCallCount: number
}

export interface AIStructuredErrorDetails {
  /** Raw text returned by the model (full). */
  rawText?: string
  /** Underlying error that triggered the wrap. */
  cause?: unknown
  /** Model id that produced this output. */
  modelId?: string
  /**
   * Flattened Zod issues when the validation step failed. Safe to serialize
   * as JSON — callers can forward this to the admin UI.
   */
  zodIssues?: Array<{
    path: Array<string | number>
    message: string
    code?: string
    expected?: string
    received?: string
  }>
}

export class AIStructuredError extends Error {
  constructor(
    message: string,
    public readonly details: AIStructuredErrorDetails = {},
  ) {
    super(message)
    this.name = 'AIStructuredError'
  }

  /**
   * Produce a compact, admin-friendly diagnostic string. Shows the first
   * Zod issue(s) plus a truncated preview of the raw model output. Safe to
   * display to a logged-in admin in the dialog's Activity log and error
   * alert.
   */
  toDiagnostic(previewLength = 500): string {
    const lines: string[] = []
    if (this.details.modelId) lines.push(`Model: ${this.details.modelId}`)
    if (this.details.zodIssues && this.details.zodIssues.length > 0) {
      const issues = this.details.zodIssues.slice(0, 3).map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : '(root)'
        return `• ${path}: ${issue.message}${
          issue.expected ? ` (expected ${issue.expected})` : ''
        }${issue.received ? `, got ${issue.received}` : ''}`
      })
      lines.push('Schema issues:')
      lines.push(...issues)
      if (this.details.zodIssues.length > 3) {
        lines.push(`…and ${this.details.zodIssues.length - 3} more`)
      }
    }
    if (this.details.rawText) {
      const preview =
        this.details.rawText.length > previewLength
          ? `${this.details.rawText.slice(0, previewLength)}…`
          : this.details.rawText
      lines.push('Raw output:')
      lines.push(preview)
    }
    return lines.join('\n')
  }
}

/**
 * Flatten a ZodError (Zod v4) into a plain-object list we can safely
 * serialize and forward to the admin UI.
 *
 * Unwraps `invalid_union` issues into their sub-issues so the user sees real
 * path + message info ("candidates: expected array, received undefined")
 * instead of a vague top-level "Invalid input".
 */
function flattenZodIssues(
  err: unknown,
): AIStructuredErrorDetails['zodIssues'] {
  if (!err || typeof err !== 'object') return undefined
  const rootIssues = (err as { issues?: unknown }).issues
  if (!Array.isArray(rootIssues)) return undefined

  const out: NonNullable<AIStructuredErrorDetails['zodIssues']> = []
  const visit = (raw: unknown, prefix: Array<string | number> = []) => {
    if (!raw || typeof raw !== 'object') return
    const issue = raw as {
      path?: Array<string | number>
      message?: string
      code?: string
      expected?: string
      received?: string
      errors?: unknown[][] // Zod v4 invalid_union: sub-errors per branch
    }
    const path = [
      ...prefix,
      ...(Array.isArray(issue.path) ? issue.path : []),
    ]
    if (issue.code === 'invalid_union' && Array.isArray(issue.errors)) {
      for (const branch of issue.errors) {
        if (!Array.isArray(branch)) continue
        for (const sub of branch) visit(sub, path)
      }
      return
    }
    out.push({
      path,
      message: typeof issue.message === 'string' ? issue.message : 'invalid',
      code: typeof issue.code === 'string' ? issue.code : undefined,
      expected: typeof issue.expected === 'string' ? issue.expected : undefined,
      received: typeof issue.received === 'string' ? issue.received : undefined,
    })
  }
  for (const issue of rootIssues) visit(issue)

  return out
}

/**
 * Events emitted by `streamStructured`. The union is intentionally narrow —
 * we surface just enough for a live "activity log" UI.
 */
export type StructuredStreamEvent<T> =
  | { kind: 'text-delta'; delta: string }
  | { kind: 'tool-call'; name: string }
  | { kind: 'tool-result'; name: string }
  | { kind: 'final'; result: GenerateStructuredResult<T> }
  | { kind: 'error'; error: AIStructuredError }

/**
 * Call the OpenAI Responses API and parse the reply as JSON validated against
 * `schema`. Blocks until the whole response is available.
 */
export async function generateStructured<T>(
  options: GenerateStructuredOptions<T>,
): Promise<GenerateStructuredResult<T>> {
  const {
    schema,
    system,
    prompt,
    modelId: modelIdOverride,
    includeWebSearch = false,
    maxSteps = 2,
    abortSignal,
  } = options

  if (!process.env.OPENAI_API_KEY) {
    throw new AIStructuredError('OPENAI_API_KEY is not configured')
  }

  const modelId = resolveModelId(modelIdOverride)

  const tools: ToolSet = includeWebSearch
    ? { web_search: openai.tools.webSearch() }
    : ({} as ToolSet)

  let result: Awaited<ReturnType<typeof generateText>>
  try {
    result = await generateText({
      model: openai.responses(modelId),
      tools,
      system,
      prompt,
      stopWhen: stepCountIs(maxSteps),
      abortSignal,
    })
  } catch (cause) {
    if (isAbortError(cause)) {
      throw new AIStructuredError('OpenAI request was aborted', { cause })
    }
    throw new AIStructuredError('OpenAI request failed', { cause })
  }

  return finalizeStructured(schema, result.text, modelId, {
    tokensIn:
      (result.usage as { inputTokens?: number; promptTokens?: number } | undefined)
        ?.inputTokens ??
      (result.usage as { inputTokens?: number; promptTokens?: number } | undefined)
        ?.promptTokens,
    tokensOut:
      (result.usage as { outputTokens?: number; completionTokens?: number } | undefined)
        ?.outputTokens ??
      (result.usage as { outputTokens?: number; completionTokens?: number } | undefined)
        ?.completionTokens,
    toolCallCount: Array.isArray(result.toolCalls) ? result.toolCalls.length : 0,
  })
}

/**
 * Streaming variant. Yields progress events and — on success — a `final`
 * event carrying the parsed + validated object.
 *
 * Usage:
 *
 *   let final: GenerateStructuredResult<T> | undefined;
 *   for await (const ev of streamStructured({ schema, prompt, ... })) {
 *     if (ev.kind === 'text-delta') emit({ kind: 'model-text-delta', ... });
 *     if (ev.kind === 'tool-call') emit({ kind: 'tool-call', name: ev.name });
 *     if (ev.kind === 'final') final = ev.result;
 *     if (ev.kind === 'error') throw ev.error;
 *   }
 */
export async function* streamStructured<T>(
  options: GenerateStructuredOptions<T>,
): AsyncGenerator<StructuredStreamEvent<T>, void, unknown> {
  const {
    schema,
    system,
    prompt,
    modelId: modelIdOverride,
    includeWebSearch = false,
    maxSteps = 2,
    abortSignal,
  } = options

  if (!process.env.OPENAI_API_KEY) {
    yield {
      kind: 'error',
      error: new AIStructuredError('OPENAI_API_KEY is not configured'),
    }
    return
  }

  const modelId = resolveModelId(modelIdOverride)

  const tools: ToolSet = includeWebSearch
    ? { web_search: openai.tools.webSearch() }
    : ({} as ToolSet)

  let stream: ReturnType<typeof streamText>
  try {
    stream = streamText({
      model: openai.responses(modelId),
      tools,
      system,
      prompt,
      stopWhen: stepCountIs(maxSteps),
      abortSignal,
    })
  } catch (cause) {
    yield {
      kind: 'error',
      error: new AIStructuredError('Failed to start OpenAI stream', { cause }),
    }
    return
  }

  let accumulatedText = ''
  let toolCallCount = 0
  let tokensIn: number | undefined
  let tokensOut: number | undefined
  let finishReason: string | undefined

  try {
    for await (const part of stream.fullStream) {
      switch (part.type) {
        case 'text-delta': {
          const delta = part.text ?? ''
          if (delta.length > 0) {
            accumulatedText += delta
            yield { kind: 'text-delta', delta }
          }
          break
        }
        case 'tool-call': {
          toolCallCount += 1
          const name = (part as { toolName?: string }).toolName ?? 'tool'
          yield { kind: 'tool-call', name }
          break
        }
        case 'tool-result': {
          const name = (part as { toolName?: string }).toolName ?? 'tool'
          yield { kind: 'tool-result', name }
          break
        }
        case 'finish': {
          finishReason = (part as { finishReason?: string }).finishReason
          const usage = (part as {
            totalUsage?: {
              inputTokens?: number
              outputTokens?: number
              promptTokens?: number
              completionTokens?: number
            }
          }).totalUsage
          tokensIn = usage?.inputTokens ?? usage?.promptTokens
          tokensOut = usage?.outputTokens ?? usage?.completionTokens
          break
        }
        case 'abort': {
          yield {
            kind: 'error',
            error: new AIStructuredError('OpenAI request was aborted'),
          }
          return
        }
        case 'error': {
          const err = (part as { error?: unknown }).error
          yield {
            kind: 'error',
            error: new AIStructuredError('OpenAI stream error', { cause: err }),
          }
          return
        }
      }
    }
  } catch (cause) {
    if (isAbortError(cause)) {
      yield {
        kind: 'error',
        error: new AIStructuredError('OpenAI request was aborted', { cause }),
      }
      return
    }
    yield {
      kind: 'error',
      error: new AIStructuredError('OpenAI stream failed', { cause }),
    }
    return
  }

  // Prefer the explicit resolved text() when available; fall back to the
  // accumulated deltas so we never miss characters that arrived via another
  // stream part type.
  let rawText = accumulatedText
  try {
    const resolved = await stream.text
    if (typeof resolved === 'string' && resolved.length > 0) rawText = resolved
  } catch {
    // ignore — we already have the buffered text
  }

  try {
    const result = finalizeStructured(schema, rawText, modelId, {
      tokensIn,
      tokensOut,
      toolCallCount,
    })
    yield { kind: 'final', result }
  } catch (err) {
    if (err instanceof AIStructuredError) {
      yield { kind: 'error', error: err }
      return
    }
    yield {
      kind: 'error',
      error: new AIStructuredError('Failed to finalize streamed output', {
        cause: err,
      }),
    }
  }

  void finishReason
}

function finalizeStructured<T>(
  schema: z.ZodType<T>,
  text: string | undefined,
  modelId: string,
  meta: { tokensIn?: number; tokensOut?: number; toolCallCount: number },
): GenerateStructuredResult<T> {
  const rawText = text?.trim() ?? ''
  if (!rawText) {
    const err = new AIStructuredError('OpenAI returned empty text', {
      rawText,
      modelId,
    })
    console.warn('[openai-responses] empty text from model', { modelId })
    throw err
  }

  const jsonString = extractJsonObject(rawText)
  if (!jsonString) {
    const err = new AIStructuredError('No JSON object found in model output', {
      rawText,
      modelId,
    })
    console.warn(
      '[openai-responses] no JSON object found in model output',
      { modelId, rawText: truncate(rawText, 1000) },
    )
    throw err
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch (cause) {
    const err = new AIStructuredError('Model output was not valid JSON', {
      rawText,
      cause,
      modelId,
    })
    console.warn('[openai-responses] invalid JSON', {
      modelId,
      rawText: truncate(rawText, 1000),
      cause: cause instanceof Error ? cause.message : String(cause),
    })
    throw err
  }

  const validation = schema.safeParse(parsed)
  if (!validation.success) {
    const zodIssues = flattenZodIssues(validation.error)
    const err = new AIStructuredError('Model output did not match schema', {
      rawText,
      cause: validation.error,
      modelId,
      zodIssues,
    })
    // IMPORTANT: This is usually the only trail we get when the model
    // returns the wrong shape. Log the full raw text + Zod issues so the
    // admin can eyeball it without rerunning.
    console.warn('[openai-responses] schema mismatch', {
      modelId,
      zodIssues,
      rawText,
    })
    throw err
  }

  return {
    object: validation.data,
    rawText,
    usage: { tokensIn: meta.tokensIn, tokensOut: meta.tokensOut },
    modelId,
    toolCallCount: meta.toolCallCount,
  }
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return `${str.slice(0, max)}…[+${str.length - max} chars]`
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const name = (err as { name?: string }).name
  if (name === 'AbortError') return true
  const cause = (err as { cause?: unknown }).cause
  if (cause && typeof cause === 'object') {
    const causeName = (cause as { name?: string }).name
    if (causeName === 'AbortError') return true
  }
  return false
}

/**
 * Try several common patterns to pull a JSON object substring out of LLM
 * text output (handles fenced code blocks, leading/trailing prose, etc.).
 */
function extractJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced && fenced[1]) {
    const inner = fenced[1].trim()
    if (inner.startsWith('{') || inner.startsWith('[')) return inner
  }

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1).trim()
  }

  return null
}
