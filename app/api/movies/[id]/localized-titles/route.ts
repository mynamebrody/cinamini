/**
 * GET /api/movies/[id]/localized-titles
 *
 * Returns the SAME merged list of localized titles that the Retitled smart
 * puzzle generator picks from — TMDB alternative_titles combined with
 * TMDB translations (for movies with only a few alternative titles),
 * filtered to the `SUPPORTED_COUNTRIES` set.
 *
 * The Retitled admin editor previously fetched `/alternative-titles` (raw
 * TMDB output). When the smart generator proposed a title that only existed
 * in the translations endpoint, the editor's dropdown couldn't surface it
 * and the `value` prop on the `<Select>` silently didn't match any item,
 * leaving the dropdown looking unselected.
 *
 * Using the merged list here means the generator's pick is guaranteed to be
 * one of the dropdown options.
 */
import { NextResponse } from 'next/server'

import { getLocalizedTitles } from '@/lib/retitled'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const movieId = Number.parseInt(id, 10)
    if (!Number.isFinite(movieId) || movieId <= 0) {
      return NextResponse.json(
        { error: 'Invalid movie id' },
        { status: 400 },
      )
    }

    const titles = await getLocalizedTitles(movieId)
    return NextResponse.json({ titles })
  } catch (error) {
    console.error('[api/movies/localized-titles] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch localized titles' },
      { status: 500 },
    )
  }
}
