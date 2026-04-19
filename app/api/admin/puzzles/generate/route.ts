/**
 * POST /api/admin/puzzles/generate — Smart Puzzle Generation
 *
 * Admin-only route that delegates to the modular puzzle generator in
 * `lib/puzzle-generator`.
 *
 * Two response modes:
 *
 *   Streaming (preferred):
 *     Request with `Accept: application/x-ndjson` (or body `{ stream: true }`)
 *     receives a newline-delimited JSON stream of `GenerationEvent`s. One
 *     event per line. Cancel by closing the underlying fetch (the route
 *     wires `request.signal` straight into the generator → AI SDK → OpenAI,
 *     which immediately stops token billing).
 *
 *   Non-streaming (legacy):
 *     Request without that Accept header gets the classic final-result JSON:
 *       200 { success: true,  puzzle, metadata }            // success
 *       200 { success: false, error, suggestions, metadata } // suggestions
 *       5xx { success: false, error, metadata }              // hard error
 *     Budget-bracket stays on this path with the legacy generator.
 *
 * The strategy layer always writes exactly one row to
 * `puzzle_generation_logs` regardless of which path the response takes.
 */

import { NextRequest, NextResponse } from 'next/server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  SUPPORTED_GAME_TYPES,
  generatePuzzle,
  generatePuzzleStream,
  type GenerationConfig,
  type GenerationRequest,
  type PuzzleGameType,
} from '@/lib/puzzle-generator'
import { resolveModelId } from '@/lib/ai/openai-responses'
import {
  generateSmartPuzzle,
  getRecentMovieIds,
  type GenerationConfig as LegacyGenerationConfig,
} from '@/lib/openai-service'

interface LegacyClientConfig {
  obscurityThreshold?: number
  avoidRecentDays?: number
  avoidSameGameDays?: number
  budgetClosenessThreshold?: number
  retitledMaxBackTranslationSimilarity?: number
}

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
      gameType?: string
      targetDate?: string
      config?: LegacyClientConfig
      modelOverride?: string
      extraExclusions?: number[]
      includeWebSearch?: boolean
      stream?: boolean
    }

    if (!body.gameType || !body.targetDate) {
      return NextResponse.json(
        { error: 'Missing required fields: gameType and targetDate' },
        { status: 400 },
      )
    }

    if (!isValidISODate(body.targetDate)) {
      return NextResponse.json(
        { error: 'targetDate must be a YYYY-MM-DD string' },
        { status: 400 },
      )
    }

    // Budget-bracket is intentionally out of scope for this rewrite; keep it
    // on the legacy OpenAI path so the budget-bracket editor still works.
    if (body.gameType === 'budget-bracket') {
      return handleLegacyBudgetBracket({
        targetDate: body.targetDate,
        config: body.config,
      })
    }

    if (!isSupportedGameType(body.gameType)) {
      return NextResponse.json(
        { error: `Invalid game type: ${body.gameType}` },
        { status: 400 },
      )
    }

    const generationRequest: GenerationRequest = {
      gameType: body.gameType,
      targetDate: body.targetDate,
      adminUserId: user.id,
      config: adaptClientConfig(body.config),
      modelOverride: body.modelOverride,
      extraExclusions: body.extraExclusions,
      includeWebSearch: body.includeWebSearch ?? false,
    }

    const wantsStream =
      body.stream === true || accepts(request, 'application/x-ndjson')

    if (wantsStream) {
      return streamGeneration(generationRequest, request.signal)
    }

    const result = await generatePuzzle(generationRequest, {
      signal: request.signal,
    })

    if (result.outcome === 'success') {
      return NextResponse.json({
        success: true,
        puzzle: result.puzzle,
        metadata: result.meta,
      })
    }

    if (result.outcome === 'suggestions') {
      return NextResponse.json({
        success: false,
        error: result.error,
        suggestions: result.suggestions,
        metadata: result.meta,
      })
    }

    if (result.outcome === 'aborted') {
      return NextResponse.json(
        { success: false, error: 'aborted', metadata: result.meta },
        { status: 499 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error,
        detail: result.detail,
        metadata: result.meta,
      },
      { status: 500 },
    )
  } catch (error) {
    console.error('[api/admin/puzzles/generate] unexpected error:', error)
    const message =
      error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Return defaults and bounds for the config sliders in the dialog.
 * Kept backwards-compatible for any caller that depends on it.
 */
export async function GET() {
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

    const service = createServiceClient()
    const { data: promptRows } = await service
      .from('puzzle_generation_prompts')
      .select('game_type, version, id')
      .eq('is_active', true)

    const activePrompts: Record<string, { id: string; version: number }> = {}
    for (const row of (promptRows ?? []) as Array<{
      game_type: string
      version: number
      id: string
    }>) {
      activePrompts[row.game_type] = { id: row.id, version: row.version }
    }

    return NextResponse.json({
      model: resolveModelId(),
      activePrompts,
      defaultConfig: {
        obscurityThreshold: 7,
        avoidRecentDays: 30,
        retitledMaxBackTranslationSimilarity: 0.6,
      },
      thresholds: {
        obscurity: {
          min: 1,
          max: 10,
          description: '1 = mainstream blockbusters, 10 = very obscure films',
        },
        avoidRecent: {
          min: 30,
          max: 90,
          description:
            'Days to look back for any game type (minimum clamped to 30)',
        },
        retitledMaxBackTranslationSimilarity: {
          min: 0.1,
          max: 0.9,
          description:
            'Upper bound on similarity between the English title and the back-translated localized title',
        },
      },
    })
  } catch (error) {
    console.error(
      '[api/admin/puzzles/generate] error returning defaults:',
      error,
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * Wrap `generatePuzzleStream` as a `Response` whose body is NDJSON (one JSON
 * event per line). The dialog reads this with ReadableStream + TextDecoder.
 */
function streamGeneration(
  req: GenerationRequest,
  signal: AbortSignal,
): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of generatePuzzleStream(req, { signal })) {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'stream error'
        try {
          controller.enqueue(
            encoder.encode(JSON.stringify({ kind: 'error', error: message }) + '\n'),
          )
          controller.enqueue(
            encoder.encode(JSON.stringify({ kind: 'done' }) + '\n'),
          )
        } catch {
          // controller may already be closed
        }
      } finally {
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
    },
    cancel() {
      // Client disconnected; generatePuzzleStream will pick that up via
      // `signal.aborted` on its next checkpoint.
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      // Disables proxy buffering (nginx / vercel edge) so lines flush live.
      'X-Accel-Buffering': 'no',
    },
  })
}

function accepts(request: NextRequest, mime: string): boolean {
  const header = request.headers.get('accept')
  if (!header) return false
  return header.split(',').some((entry) => entry.trim().startsWith(mime))
}

function isSupportedGameType(value: string): value is PuzzleGameType {
  return (SUPPORTED_GAME_TYPES as readonly string[]).includes(value)
}

function isValidISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/**
 * Map the legacy dialog config to `GenerationConfig`. `avoidSameGameDays` is
 * intentionally dropped — same-game exclusion is now "ever" — and
 * `budgetClosenessThreshold` is only meaningful for budget-bracket which is
 * out of scope for this generator.
 */
function adaptClientConfig(
  config: LegacyClientConfig | undefined,
): GenerationConfig | undefined {
  if (!config) return undefined
  const out: GenerationConfig = {}
  if (typeof config.obscurityThreshold === 'number') {
    out.obscurityThreshold = config.obscurityThreshold
  }
  if (typeof config.avoidRecentDays === 'number') {
    out.avoidRecentDays = config.avoidRecentDays
  }
  if (typeof config.retitledMaxBackTranslationSimilarity === 'number') {
    out.retitledMaxBackTranslationSimilarity =
      config.retitledMaxBackTranslationSimilarity
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * Legacy budget-bracket generation path.
 *
 * The new modular generator (`lib/puzzle-generator`) only covers Retitled,
 * Cast Climb, and Poster Pixels per GH issue #55. Budget Bracket continues
 * to use the older `generateSmartPuzzle` helper so its UI keeps working.
 */
async function handleLegacyBudgetBracket(args: {
  targetDate: string
  config: LegacyClientConfig | undefined
}): Promise<NextResponse> {
  const serviceSupabase = createServiceClient()
  const recentDays = args.config?.avoidRecentDays ?? 30
  const sameGameDays = args.config?.avoidSameGameDays ?? 365

  const [allRecentIds, sameGameIds] = await Promise.all([
    getRecentMovieIds(serviceSupabase, undefined, recentDays),
    getRecentMovieIds(serviceSupabase, 'budget-bracket', sameGameDays),
  ])
  const avoidMovieIds = Array.from(new Set([...allRecentIds, ...sameGameIds]))

  const legacyConfig: LegacyGenerationConfig = {
    obscurityThreshold: args.config?.obscurityThreshold ?? 7,
    budgetClosenessThreshold: args.config?.budgetClosenessThreshold ?? 0.3,
    avoidRecentDays: recentDays,
    avoidSameGameDays: sameGameDays,
  }

  const result = await generateSmartPuzzle(
    {
      gameType: 'budget-bracket',
      targetDate: args.targetDate,
      config: legacyConfig,
    },
    avoidMovieIds,
  )

  if (!result.success) {
    return NextResponse.json({
      success: false,
      error: result.error,
      suggestions: result.suggestions ?? [],
      metadata: {
        gameType: 'budget-bracket',
        targetDate: args.targetDate,
        avoidedMovieIds: avoidMovieIds.length,
        config: legacyConfig,
      },
    })
  }

  return NextResponse.json({
    success: true,
    puzzle: result.puzzle,
    metadata: {
      gameType: 'budget-bracket',
      targetDate: args.targetDate,
      avoidedMovieIds: avoidMovieIds.length,
      config: legacyConfig,
    },
  })
}
