/**
 * Admin CRUD for `puzzle_generation_prompts`.
 *
 *   GET /api/admin/puzzles/prompts
 *     Returns every prompt row, newest first. Optional `?gameType=retitled`
 *     narrows to one game.
 *
 *   PUT /api/admin/puzzles/prompts
 *     Body: { id: string, action?: 'activate', system_prompt?, user_prompt_template?,
 *             notes?, is_active? }
 *     - If `action === 'activate'` OR `is_active === true`:
 *       deactivates every other row for that game_type, then activates this one.
 *     - Any other provided fields update in place on the same row.
 *
 *   POST /api/admin/puzzles/prompts
 *     Body: { game_type, system_prompt, user_prompt_template, notes?, activate? }
 *     Creates a new version row. Version = max(existing versions) + 1.
 *     If `activate === true`, also deactivates siblings and activates the new row.
 *
 * Super-admin only. Uses the service-role client so we can bypass RLS — the
 * admin check is done manually against `cinamini_user_profiles.is_super_admin`.
 */

import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { SUPPORTED_GAME_TYPES, type PuzzleGameType } from '@/lib/puzzle-generator'

type PromptRow = {
  id: string
  game_type: string
  version: number
  system_prompt: string
  user_prompt_template: string
  is_active: boolean
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

async function requireSuperAdmin(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  const { data: profile } = await supabase
    .from('cinamini_user_profiles')
    .select('is_super_admin')
    .eq('user_id', user.id)
    .single()
  if (!profile?.is_super_admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return { ok: true, userId: user.id }
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  const gameTypeFilter = request.nextUrl.searchParams.get('gameType')
  const service = createServiceClient()

  let query = service
    .from('puzzle_generation_prompts')
    .select('id, game_type, version, system_prompt, user_prompt_template, is_active, notes, created_by, created_at, updated_at')
    .order('game_type', { ascending: true })
    .order('version', { ascending: false })

  if (gameTypeFilter) {
    if (!isSupportedGameType(gameTypeFilter)) {
      return NextResponse.json(
        { error: `Invalid gameType: ${gameTypeFilter}` },
        { status: 400 },
      )
    }
    query = query.eq('game_type', gameTypeFilter)
  }

  const { data, error } = await query
  if (error) {
    console.error('[api/admin/puzzles/prompts] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ prompts: (data ?? []) as PromptRow[] })
}

export async function PUT(request: NextRequest) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  const body = (await request.json()) as {
    id?: string
    system_prompt?: string
    user_prompt_template?: string
    notes?: string | null
    is_active?: boolean
    action?: 'activate'
  }

  if (!body.id || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: existing, error: fetchErr } = await service
    .from('puzzle_generation_prompts')
    .select('id, game_type')
    .eq('id', body.id)
    .single()
  if (fetchErr || !existing) {
    return NextResponse.json(
      { error: `Prompt not found: ${body.id}` },
      { status: 404 },
    )
  }

  const shouldActivate = body.action === 'activate' || body.is_active === true
  const shouldDeactivate = body.is_active === false && body.action !== 'activate'

  const updates: Record<string, unknown> = {}
  if (typeof body.system_prompt === 'string') {
    updates.system_prompt = body.system_prompt
  }
  if (typeof body.user_prompt_template === 'string') {
    updates.user_prompt_template = body.user_prompt_template
  }
  if (body.notes === null || typeof body.notes === 'string') {
    updates.notes = body.notes
  }
  if (shouldDeactivate) {
    updates.is_active = false
  }

  if (Object.keys(updates).length > 0) {
    const { error: updErr } = await service
      .from('puzzle_generation_prompts')
      .update(updates)
      .eq('id', body.id)
    if (updErr) {
      console.error('[api/admin/puzzles/prompts] PUT update error:', updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }
  }

  if (shouldActivate) {
    const activateErr = await activatePrompt(service, (existing as any).game_type, body.id)
    if (activateErr) {
      return NextResponse.json({ error: activateErr }, { status: 500 })
    }
  }

  const { data: fresh } = await service
    .from('puzzle_generation_prompts')
    .select('id, game_type, version, system_prompt, user_prompt_template, is_active, notes, created_by, created_at, updated_at')
    .eq('id', body.id)
    .single()

  return NextResponse.json({ prompt: fresh })
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  const body = (await request.json()) as {
    game_type?: string
    system_prompt?: string
    user_prompt_template?: string
    notes?: string | null
    activate?: boolean
  }

  if (!body.game_type || !isSupportedGameType(body.game_type)) {
    return NextResponse.json(
      { error: 'Valid game_type is required' },
      { status: 400 },
    )
  }
  if (!body.system_prompt || !body.user_prompt_template) {
    return NextResponse.json(
      { error: 'system_prompt and user_prompt_template are required' },
      { status: 400 },
    )
  }

  const service = createServiceClient()

  const { data: maxRow } = await service
    .from('puzzle_generation_prompts')
    .select('version')
    .eq('game_type', body.game_type)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextVersion = (maxRow?.version ?? 0) + 1

  const { data: inserted, error: insertErr } = await service
    .from('puzzle_generation_prompts')
    .insert({
      game_type: body.game_type,
      version: nextVersion,
      system_prompt: body.system_prompt,
      user_prompt_template: body.user_prompt_template,
      notes: body.notes ?? null,
      is_active: false,
      created_by: auth.userId,
    })
    .select('id, game_type, version, system_prompt, user_prompt_template, is_active, notes, created_by, created_at, updated_at')
    .single()
  if (insertErr || !inserted) {
    console.error('[api/admin/puzzles/prompts] POST insert error:', insertErr)
    return NextResponse.json(
      { error: insertErr?.message ?? 'Insert failed' },
      { status: 500 },
    )
  }

  if (body.activate) {
    const activateErr = await activatePrompt(
      service,
      (inserted as any).game_type,
      (inserted as any).id,
    )
    if (activateErr) {
      return NextResponse.json({ error: activateErr }, { status: 500 })
    }
    const { data: fresh } = await service
      .from('puzzle_generation_prompts')
      .select('id, game_type, version, system_prompt, user_prompt_template, is_active, notes, created_by, created_at, updated_at')
      .eq('id', (inserted as any).id)
      .single()
    return NextResponse.json({ prompt: fresh }, { status: 201 })
  }

  return NextResponse.json({ prompt: inserted }, { status: 201 })
}

function isSupportedGameType(value: string): value is PuzzleGameType {
  return (SUPPORTED_GAME_TYPES as readonly string[]).includes(value)
}

/**
 * Deactivate every sibling row for the given game_type, then activate the
 * target row. Order matters: the unique partial index allows only one active
 * row per game_type.
 */
async function activatePrompt(
  supabase: SupabaseClient,
  gameType: string,
  id: string,
): Promise<string | null> {
  const { error: clearErr } = await supabase
    .from('puzzle_generation_prompts')
    .update({ is_active: false })
    .eq('game_type', gameType)
    .neq('id', id)
  if (clearErr) {
    console.error('[api/admin/puzzles/prompts] clear active error:', clearErr)
    return clearErr.message
  }
  const { error: activateErr } = await supabase
    .from('puzzle_generation_prompts')
    .update({ is_active: true })
    .eq('id', id)
  if (activateErr) {
    console.error('[api/admin/puzzles/prompts] activate error:', activateErr)
    return activateErr.message
  }
  return null
}
