/**
 * Client-side helper for consuming `/api/admin/movies/fun-facts` as NDJSON.
 *
 * Shared by the three puzzle editors (retitled, cast-climb, poster-pixels)
 * so each editor can:
 *   - show facts live as they stabilize
 *   - present a Stop button backed by AbortController
 *   - opt into the "Grounded" (web_search) path when the admin wants
 *     citations
 *
 * Returns the final list of facts (collected along the way). Throws on
 * abort or stream error — callers should narrow with `isAbortError`.
 */

export interface FunFact {
  text: string
  source: { title: string; url: string } | null
}

export interface StreamFunFactsOptions {
  title: string
  year?: number | string
  signal?: AbortSignal
  includeWebSearch?: boolean
  /**
   * Called for each fact as it stabilizes. Facts may arrive slightly out of
   * order (their `index` is authoritative), but the server typically emits
   * them strictly left-to-right so `index` is monotonic in practice.
   */
  onFact?: (fact: FunFact, index: number) => void
}

type FunFactStreamLine =
  | { kind: 'fact'; index: number; fact: FunFact }
  | { kind: 'done'; facts: FunFact[] }
  | { kind: 'error'; error: string }
  | { kind: 'aborted' }

export async function streamFunFacts(
  options: StreamFunFactsOptions,
): Promise<FunFact[]> {
  const response = await fetch('/api/admin/movies/fun-facts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson',
    },
    body: JSON.stringify({
      title: options.title,
      year: options.year,
      includeWebSearch: Boolean(options.includeWebSearch),
      stream: true,
    }),
    signal: options.signal,
  })

  if (!response.ok || !response.body) {
    let message = `Fun-facts request failed (${response.status})`
    try {
      const body = await response.json()
      if (body?.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  const collected: FunFact[] = []

  const consumeLine = (line: string) => {
    if (!line.trim()) return
    let event: FunFactStreamLine
    try {
      event = JSON.parse(line) as FunFactStreamLine
    } catch {
      return
    }
    if (event.kind === 'fact') {
      collected[event.index] = event.fact
      options.onFact?.(event.fact, event.index)
    } else if (event.kind === 'done') {
      for (let i = 0; i < event.facts.length; i += 1) {
        if (!collected[i]) collected[i] = event.facts[i]
      }
    } else if (event.kind === 'error') {
      throw new Error(event.error)
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) consumeLine(line)
  }
  if (buf.trim()) consumeLine(buf)

  return collected.filter(Boolean)
}

export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const name = (err as { name?: string }).name
  return name === 'AbortError'
}
