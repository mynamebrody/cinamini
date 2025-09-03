import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@/lib/openai-client'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('cinamini_user_profiles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { title, year } = body || {}

    if (!title) {
      return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 })
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const userPrompt = `Provide 6 short, spoiler-free, verifiable fun facts or production trivia about the film "${title}"${year ? ` (${year})` : ''}.
Keep each fact 1-2 sentences, under 220 characters, no plot spoilers, no actor ages.
For each fact, include a reputable source with a URL (e.g., TMDB trivia first and foremost, official interviews, major outlets,, or Wikipedia with specific section where possible). Do not come up with fake facts. Always have a legitimate source.
Return strictly JSON with this schema:
{ "facts": [ { "text": string, "source": { "title": string, "url": string } | null } ] }.`


    console.log('[fun-facts] request', { title, year, user: user.id })
    const startedAt = Date.now()
    let response
    try {
        response = await openai.responses.create({
            model: "gpt-4o-mini",
            tools: [
                { type: "web_search" },
            ],
            input: userPrompt,
        })
    } catch (sdkError) {
      console.error('[fun-facts] OpenAI error', sdkError)
      return NextResponse.json({ error: 'OpenAI request failed' }, { status: 502 })
    }

    const durationMs = Date.now() - startedAt
    let content: string = (response as any)?.output_text || '{}'
    console.log('[fun-facts] response', { durationMs, preview: content.slice(0, 200) })
    let parsed
    try {
      if (content.startsWith('```')) {
        content = content.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '')
      }
      parsed = JSON.parse(content)
    } catch (parseError) {
      try {
        const start = content.indexOf('{')
        const end = content.lastIndexOf('}')
        if (start !== -1 && end !== -1 && end > start) {
          const jsonSlice = content.slice(start, end + 1)
          parsed = JSON.parse(jsonSlice)
        } else {
          parsed = { facts: [] }
        }
      } catch (recoverError) {
        console.error('[fun-facts] JSON parse error', { preview: content.slice(0, 500), parseError, recoverError })
        parsed = { facts: [] }
      }
    }
    const items = Array.isArray(parsed.facts) ? parsed.facts : []
    const normalized = items.map((item: any) => {
      if (typeof item === 'string') {
        return { text: item, source: null as any }
      }
      const text = typeof item?.text === 'string' ? item.text : ''
      const sourceTitle = typeof item?.source?.title === 'string' ? item.source.title : undefined
      const sourceUrl = typeof item?.source?.url === 'string' ? item.source.url : undefined
      const source = sourceTitle && sourceUrl ? { title: sourceTitle, url: sourceUrl } : null
      return { text, source }
    }).filter((x: any) => typeof x.text === 'string' && x.text.trim().length > 0)

    if (normalized.length === 0) {
      console.warn('[fun-facts] no facts generated', { title, year, preview: content.slice(0, 200) })
      return NextResponse.json({ error: 'No facts generated' }, { status: 400 })
    }

    console.log('[fun-facts] success', { count: normalized.length })
    return NextResponse.json({ facts: normalized })
  } catch (error) {
    console.error('[fun-facts] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


