/**
 * POST /api/admin/movies/fun-facts
 *
 * Admin-only route that returns 6 sourced, spoiler-free fun facts about a
 * film.
 *
 * Two response modes:
 *
 *   Streaming (Accept: application/x-ndjson, or body `stream: true`):
 *     NDJSON where each line is one of:
 *       { kind: "fact", index, fact: { text, source | null } }
 *       { kind: "done", facts: [...] }
 *       { kind: "error", error: string }
 *     Facts flush to the client as soon as each one stabilizes — the editor
 *     can render them live without waiting for the full set.
 *
 *   Non-streaming (legacy):
 *     200 { facts: [{ text, source | null }, ...] }
 *
 * Model is controlled by `OPENAI_PUZZLE_MODEL` (default `gpt-5-mini`),
 * overridable per request via `modelOverride`. `includeWebSearch` defaults
 * to FALSE so the happy path is ~10× faster than the tool-using version;
 * callers opt in when citations matter ("Grounded" toggle in the admin UI).
 */

import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@ai-sdk/openai'
import { streamObject } from 'ai'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import {
  AIStructuredError,
  generateStructured,
  resolveModelId,
} from '@/lib/ai/openai-responses'

// IMPORTANT: this schema is consumed by OpenAI Structured Outputs (via
// `streamObject`), which is much stricter than vanilla JSON Schema:
//
//   1. `format: "uri"` is not in OpenAI's allow-list, so we cannot use
//      `z.string().url()` — it would map to `format: "uri"` and the API
//      rejects the whole response_format. We accept any string here and
//      validate URL shape ourselves in `sanitizeSource` below.
//
//   2. EVERY property must appear in the JSON Schema `required` array;
//      OpenAI rejects schemas that omit any key from `required`. Zod's
//      `.optional()` causes the AI SDK to drop the key from `required`,
//      so we use `.nullable()` instead — the field is always present in
//      the model's response and may be `null` when there's no source.
//
// Both rules are platform-specific: a regular Zod `.optional()` /
// `.url()` works fine for plain JSON validation, just not for OpenAI's
// structured-output schema check.
const SourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().min(1),
})

const FactSchema = z.object({
  text: z.string().min(1),
  source: SourceSchema.nullable(),
})

const ResponseSchema = z.object({
  facts: z.array(FactSchema),
})

type Fact = z.infer<typeof FactSchema>

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('cinamini_user_profiles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_super_admin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 },
      )
    }

    const body = (await request.json()) as {
      title?: string
      year?: string | number
      modelOverride?: string
      includeWebSearch?: boolean
      stream?: boolean
    }
    const { title, year, modelOverride } = body
    const includeWebSearch = Boolean(body.includeWebSearch)

    if (!title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 },
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 },
      )
    }

    const yearText = year ? ` (${year})` : ''
    const system = `You are a film-history researcher. You only produce verifiable facts that are grounded in reputable sources (TMDB trivia, official interviews, major outlets, Wikipedia section anchors). You NEVER invent sources or facts.`

    const searchHint = includeWebSearch
      ? 'Use the web_search tool whenever you need to verify something.'
      : 'Rely on your training knowledge. If you cannot verify a fact, drop it rather than fabricating a source.'

    const prompt = `Provide 6 short, spoiler-free, verifiable fun facts or production trivia about the film "${title}"${yearText}.

Rules:
- Each fact: 1-2 sentences, under 220 characters.
- No plot spoilers.
- No actor ages.
- For each fact, include a reputable source with a URL — TMDB trivia first when possible, otherwise official interviews, major outlets, or Wikipedia with a section anchor.
- If you cannot verify a fact from a real source, drop it. Never fabricate a source.

${searchHint}

Return JSON exactly like:
{ "facts": [ { "text": string, "source": { "title": string, "url": string } | null } ] }`

    const wantsStream =
      body.stream === true || accepts(request, 'application/x-ndjson')

    if (wantsStream) {
      return streamFunFacts({
        system,
        prompt,
        includeWebSearch,
        modelOverride,
        signal: request.signal,
      })
    }

    let result
    try {
      result = await generateStructured({
        schema: ResponseSchema,
        system,
        prompt,
        modelId: modelOverride,
        includeWebSearch,
        maxSteps: includeWebSearch ? 2 : 1,
        abortSignal: request.signal,
      })
    } catch (err) {
      if (err instanceof AIStructuredError) {
        console.warn('[fun-facts] structured AI error:', err.message)
        return NextResponse.json(
          { error: 'Model failed to return valid facts' },
          { status: 502 },
        )
      }
      throw err
    }

    const normalized = normalizeFacts(result.object.facts)

    if (normalized.length === 0) {
      console.warn('[fun-facts] no facts returned', {
        title,
        year,
        preview: result.rawText.slice(0, 200),
      })
      return NextResponse.json({ error: 'No facts generated' }, { status: 400 })
    }

    return NextResponse.json({ facts: normalized })
  } catch (error) {
    console.error('[fun-facts] unexpected error', error)
    const message =
      error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Streaming implementation. Uses AI SDK `streamObject` so `partialObjectStream`
 * gives us a DeepPartial after every token, and we flush any newly stable
 * `facts[i]` entry to the client immediately.
 */
function streamFunFacts(args: {
  system: string
  prompt: string
  includeWebSearch: boolean
  modelOverride?: string
  signal: AbortSignal
}): Response {
  const encoder = new TextEncoder()
  const modelId = resolveModelId(args.modelOverride)

  // streamObject doesn't currently support multi-step tool loops on the
  // Responses provider. When the caller asks for grounding, fall back to
  // the blocking path via generateStructured and emit the facts after the
  // tool-assisted completion resolves.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const writeLine = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
        } catch {
          // controller may already be closed
        }
      }

      try {
        if (args.includeWebSearch) {
          const result = await generateStructured({
            schema: ResponseSchema,
            system: args.system,
            prompt: args.prompt,
            modelId,
            includeWebSearch: true,
            maxSteps: 2,
            abortSignal: args.signal,
          })
          const facts = normalizeFacts(result.object.facts)
          facts.forEach((fact, index) => writeLine({ kind: 'fact', index, fact }))
          writeLine({ kind: 'done', facts })
          return
        }

        const stream = streamObject({
          model: openai.responses(modelId),
          schema: ResponseSchema,
          system: args.system,
          prompt: args.prompt,
          abortSignal: args.signal,
        })

        const flushed: Fact[] = []
        for await (const partial of stream.partialObjectStream) {
          if (args.signal.aborted) break
          const factsPartial = Array.isArray(partial?.facts)
            ? (partial.facts as Array<Partial<Fact> | undefined>)
            : []
          for (let i = 0; i < factsPartial.length; i += 1) {
            const entry = factsPartial[i]
            if (!entry) continue
            const stable = stabilizeFact(entry, i, factsPartial.length)
            if (!stable) continue
            if (flushed[i]) continue
            flushed[i] = stable
            writeLine({ kind: 'fact', index: i, fact: stable })
          }
        }

        try {
          const finalObj = await stream.object
          const normalized = normalizeFacts(finalObj.facts)
          for (let i = 0; i < normalized.length; i += 1) {
            if (!flushed[i]) {
              flushed[i] = normalized[i]
              writeLine({ kind: 'fact', index: i, fact: normalized[i] })
            }
          }
          writeLine({ kind: 'done', facts: flushed.filter(Boolean) })
        } catch (err) {
          if (isAbortError(err) || args.signal.aborted) {
            writeLine({ kind: 'aborted' })
          } else {
            const message = err instanceof Error ? err.message : 'stream failed'
            writeLine({ kind: 'error', error: message })
          }
        }
      } catch (err) {
        if (isAbortError(err) || args.signal.aborted) {
          writeLine({ kind: 'aborted' })
        } else {
          const message = err instanceof Error ? err.message : 'stream failed'
          writeLine({ kind: 'error', error: message })
        }
      } finally {
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}

/**
 * Only flush a partial fact once its `text` looks complete: ends with
 * terminal punctuation OR there's at least one more in-flight entry behind
 * it (so we know this fact's text has stopped growing).
 */
function stabilizeFact(
  entry: Partial<Fact>,
  index: number,
  totalSoFar: number,
): Fact | null {
  const text = typeof entry.text === 'string' ? entry.text.trim() : ''
  if (text.length < 12) return null
  const hasSubsequent = index < totalSoFar - 1
  const endsTerminal = /[.!?"'\]]$/.test(text)
  if (!hasSubsequent && !endsTerminal) return null
  const rawSource =
    entry.source && typeof entry.source === 'object'
      ? (entry.source as { title?: unknown; url?: unknown })
      : null
  const source = sanitizeSource(rawSource)
  return { text, source }
}

function normalizeFacts(
  facts: Array<{ text: string; source?: { title: string; url: string } | null }>,
): Fact[] {
  return facts
    .map((item) => ({
      text: item.text.trim(),
      source: sanitizeSource(item.source),
    }))
    .filter((x) => x.text.length > 0)
}

// Schema only requires non-empty strings (see comment on SourceSchema). Drop
// the source entirely if its URL doesn't look HTTP(S). That way bad rows
// downgrade to "fact without citation" rather than getting surfaced with a
// broken link.
function sanitizeSource(
  source: { title?: unknown; url?: unknown } | null | undefined,
): { title: string; url: string } | null {
  if (!source) return null
  const title = typeof source.title === 'string' ? source.title.trim() : ''
  const url = typeof source.url === 'string' ? source.url.trim() : ''
  if (!title || !url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  } catch {
    return null
  }
  return { title, url }
}

function accepts(request: NextRequest, mime: string): boolean {
  const header = request.headers.get('accept')
  if (!header) return false
  return header.split(',').some((entry) => entry.trim().startsWith(mime))
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const name = (err as { name?: string }).name
  if (name === 'AbortError') return true
  const cause = (err as { cause?: unknown }).cause
  if (cause && typeof cause === 'object') {
    if ((cause as { name?: string }).name === 'AbortError') return true
  }
  return false
}
