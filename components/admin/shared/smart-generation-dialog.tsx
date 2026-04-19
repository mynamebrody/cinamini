"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Wand2,
  Loader2,
  Settings,
  AlertCircle,
  CheckCircle,
  Info,
  StopCircle,
  Sparkles,
  Activity,
  ChevronRight,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type {
  CandidateAttempt,
  GenerationEvent,
  RichSuggestion,
} from "@/lib/puzzle-generator/events"

interface SmartGenerationDialogProps {
  gameType: 'retitled' | 'budget-bracket' | 'cast-climb' | 'poster-pixels'
  /**
   * Current puzzle date in the editor. When empty/undefined, the dialog will
   * auto-resolve to the next available date from today for this gameType.
   */
  targetDate?: string
  onGenerate: (puzzleData: any) => void
  className?: string
}

interface GenerateMeta {
  model?: string
  activePrompts?: Record<string, { id: string; version: number }>
}

interface ActivityEntry {
  id: string
  label: string
  detail?: string
  variant: 'status' | 'candidates' | 'scored-ok' | 'scored-ko' | 'tool' | 'error'
}

function formatDisplayDate(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

export default function SmartGenerationDialog({
  gameType,
  targetDate,
  onGenerate,
  className,
}: SmartGenerationDialogProps) {
  const [open, setOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [resolvedDate, setResolvedDate] = useState<string>("")
  const [resolvingDate, setResolvingDate] = useState(false)
  const [dateSource, setDateSource] = useState<'editor' | 'auto'>('editor')

  const [config, setConfig] = useState({
    obscurityThreshold: 7,
    budgetClosenessThreshold: 0.3,
    avoidRecentDays: 30,
    avoidSameGameDays: 365,
  })
  const [includeWebSearch, setIncludeWebSearch] = useState(false)

  const [meta, setMeta] = useState<GenerateMeta>({})
  const [suggestions, setSuggestions] = useState<RichSuggestion[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const activityIdRef = useRef(0)

  const isStreamingSupported = gameType !== 'budget-bracket'
  const activePrompt = meta.activePrompts?.[gameType]

  const pushActivity = (entry: Omit<ActivityEntry, 'id'>) => {
    setActivity((prev) => {
      activityIdRef.current += 1
      const next = [...prev, { ...entry, id: String(activityIdRef.current) }]
      // keep list bounded so the dialog doesn't grow unbounded on long runs
      if (next.length > 40) next.shift()
      return next
    })
  }

  useEffect(() => {
    if (!open) {
      if (targetDate) {
        setResolvedDate(targetDate)
        setDateSource('editor')
      } else {
        setResolvedDate("")
      }
    }
  }, [targetDate, open])

  useEffect(() => {
    if (!open) return
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('/api/admin/puzzles/generate')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        setMeta({ model: data.model, activePrompts: data.activePrompts })
      } catch (err) {
        console.warn('[SmartGenerationDialog] failed to load meta:', err)
      }
    })()

    if (targetDate) {
      setResolvedDate(targetDate)
      setDateSource('editor')
    } else {
      setResolvingDate(true)
      ;(async () => {
        try {
          const res = await fetch(
            `/api/admin/puzzles/next-available-date?gameType=${gameType}`,
          )
          const data = await res.json().catch(() => ({}))
          if (cancelled) return
          if (!res.ok || !data?.date) {
            setError(
              data?.error ||
                'Could not find an available puzzle date. Please set one manually.',
            )
            setResolvedDate("")
          } else {
            setResolvedDate(data.date)
            setDateSource('auto')
            setError(null)
          }
        } catch (err) {
          if (cancelled) return
          console.error('[SmartGenerationDialog] next-available-date error', err)
          setError('Could not resolve next available date.')
          setResolvedDate("")
        } finally {
          if (!cancelled) setResolvingDate(false)
        }
      })()
    }

    return () => {
      cancelled = true
    }
  }, [open, targetDate, gameType])

  // Abort any in-flight request when the dialog closes.
  useEffect(() => {
    if (!open && abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [open])

  const displayDate = useMemo(
    () => (resolvedDate ? formatDisplayDate(resolvedDate) : ""),
    [resolvedDate],
  )

  const handleCancel = () => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    pushActivity({
      label: 'Generation cancelled',
      detail: 'Closed the OpenAI connection.',
      variant: 'error',
    })
    setIsGenerating(false)
  }

  const handleGenerate = async () => {
    if (!resolvedDate) {
      setError('No puzzle date available. Please set one manually.')
      return
    }

    // abort any previous run
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsGenerating(true)
    setError(null)
    setErrorDetail(null)
    setSuccess(false)
    setSuggestions([])
    setActivity([])
    activityIdRef.current = 0

    const payload = {
      gameType,
      targetDate: resolvedDate,
      config,
      includeWebSearch,
    }

    if (!isStreamingSupported) {
      // Budget-bracket falls through to legacy JSON (it doesn't stream).
      try {
        const response = await fetch('/api/admin/puzzles/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate puzzle')
        }
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(suggestionFromLegacy(data.suggestions))
          setError(
            data.error ||
              'Could not generate puzzle automatically. Here are some suggestions:',
          )
        } else if (data.puzzle) {
          setSuccess(true)
          onGenerate({ ...data.puzzle, puzzle_date: resolvedDate })
          setTimeout(() => {
            setOpen(false)
            setSuccess(false)
          }, 1500)
        }
      } catch (err) {
        if (isAbortError(err)) return
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        setIsGenerating(false)
        abortRef.current = null
      }
      return
    }

    try {
      const response = await fetch('/api/admin/puzzles/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/x-ndjson',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        let message = `Request failed (${response.status})`
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

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line) as GenerationEvent
            handleEvent(event)
          } catch (err) {
            console.warn('[SmartGenerationDialog] bad NDJSON line:', line, err)
          }
        }
      }
      if (buf.trim()) {
        try {
          const event = JSON.parse(buf) as GenerationEvent
          handleEvent(event)
        } catch {
          // ignore trailing buffer parse errors
        }
      }
    } catch (err) {
      if (isAbortError(err)) return
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsGenerating(false)
      abortRef.current = null
    }
  }

  const handleEvent = (event: GenerationEvent) => {
    switch (event.kind) {
      case 'status':
        pushActivity({
          label: event.label,
          detail: event.detail,
          variant: 'status',
        })
        break
      case 'model-text-delta':
        // Omit raw text deltas from the activity feed — they're too noisy.
        // (Still useful for future debugging; see console.debug.)
        break
      case 'tool-call':
        pushActivity({
          label: `Tool call: ${event.name}`,
          variant: 'tool',
        })
        break
      case 'candidates':
        pushActivity({
          label: `Model proposed ${event.ids.length} candidate${event.ids.length === 1 ? '' : 's'}`,
          detail: event.reasoning,
          variant: 'candidates',
        })
        break
      case 'candidate-scored': {
        const a = event.attempt
        const ok = a.verdict === 'accepted'
        pushActivity({
          label: `${ok ? '✓' : '✗'} ${a.movie.title}${a.movie.release_year ? ` (${a.movie.release_year})` : ''}`,
          detail: ok
            ? a.localizedTitle
              ? `“${a.localizedTitle.title}” — ${a.localizedTitle.countryName} · back-translates to “${a.localizedTitle.backTranslation}” (similarity ${a.localizedTitle.similarity.toFixed(2)})`
              : a.reasoning
            : a.reason,
          variant: ok ? 'scored-ok' : 'scored-ko',
        })
        break
      }
      case 'suggestions':
        setSuggestions(event.suggestions)
        setError(
          event.error ||
            'Could not generate puzzle automatically. Here are some suggestions:',
        )
        break
      case 'success':
        setSuccess(true)
        onGenerate({ ...(event.puzzle as object), puzzle_date: resolvedDate })
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
        }, 1500)
        break
      case 'error': {
        setError(event.error)
        const detail = 'detail' in event ? event.detail : undefined
        if (detail) {
          setErrorDetail(detail)
          pushActivity({
            variant: 'error',
            label: event.error,
            detail,
          })
        }
        break
      }
      case 'aborted':
        // pushed by the cancel handler; no-op here
        break
      case 'done':
        break
    }
  }

  const handleSelectSuggestion = (suggestion: RichSuggestion) => {
    onGenerate({
      selectedMovie: {
        id: suggestion.movie.id,
        title: suggestion.movie.title,
        poster_path: suggestion.movie.poster_path,
        release_date: suggestion.movie.release_year
          ? `${suggestion.movie.release_year}-01-01`
          : undefined,
      },
      localized_title: suggestion.localizedTitle?.title,
      country_code: suggestion.localizedTitle?.countryCode,
      country_name: suggestion.localizedTitle?.countryName,
      english_translation: suggestion.localizedTitle?.backTranslation,
      similarity: suggestion.localizedTitle?.similarity,
      suggestion_reasoning: suggestion.reasoning,
      puzzle_date: resolvedDate || undefined,
    })
    setOpen(false)
  }

  const getGameDescription = () => {
    switch (gameType) {
      case 'retitled':
        return 'Generate a puzzle with an interesting foreign title'
      case 'budget-bracket':
        return 'Generate movie pairs with comparable budgets'
      case 'cast-climb':
        return 'Generate a puzzle with a memorable ensemble cast'
      case 'poster-pixels':
        return 'Generate a puzzle with an iconic poster'
      default:
        return 'Generate a smart puzzle'
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 border-2 border-purple-500 text-purple-700 hover:bg-purple-50",
            className,
          )}
        >
          <Wand2 className="w-4 h-4" />
          Smart Generate
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-600" />
            Smart Puzzle Generation
          </DialogTitle>
          <DialogDescription>
            {getGameDescription()}
            {resolvedDate ? ` for ${displayDate}` : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs">
            <Info className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-0.5 text-gray-800">
              <div>
                <span className="text-gray-500">Puzzle date:</span>{" "}
                {resolvingDate ? (
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Finding next available date…
                  </span>
                ) : resolvedDate ? (
                  <>
                    <code className="font-mono">{resolvedDate}</code>
                    <span className="text-gray-500">
                      {' '}
                      ({displayDate}
                      {dateSource === 'auto' ? ', auto-selected' : ''})
                    </span>
                  </>
                ) : (
                  <span className="text-red-600">No date available</span>
                )}
              </div>
              <div className="text-[11px] text-gray-500">
                Running this will <strong>override</strong> any currently
                selected movie or puzzle details in the editor.
              </div>
            </div>
          </div>

          {isStreamingSupported && (meta.model || activePrompt) && (
            <div className="flex items-start gap-2 p-2.5 bg-purple-50 border border-purple-200 rounded-md text-xs">
              <Info className="w-4 h-4 text-purple-700 mt-0.5 flex-shrink-0" />
              <div className="space-y-0.5 text-purple-900">
                {meta.model && (
                  <div>
                    <span className="text-purple-600">Model:</span>{" "}
                    <code className="font-mono">{meta.model}</code>
                  </div>
                )}
                {activePrompt && (
                  <div>
                    <span className="text-purple-600">Prompt:</span>{" "}
                    v{activePrompt.version}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="obscurity">Movie Obscurity Level</Label>
                <Badge variant="secondary">
                  {config.obscurityThreshold}/10
                </Badge>
              </div>
              <Slider
                id="obscurity"
                min={1}
                max={10}
                step={1}
                value={[config.obscurityThreshold]}
                onValueChange={([value]) =>
                  setConfig((prev) => ({ ...prev, obscurityThreshold: value }))
                }
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Maximum allowed obscurity. 1 = blockbusters only (~1M+ TMDB
                votes), 7 = mainstream cinema (≥1k votes), 10 = anything goes.
                Raise this if every candidate is being rejected as too
                obscure.
              </p>
            </div>

            {gameType === 'budget-bracket' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="budget">Budget Closeness</Label>
                  <Badge variant="secondary">
                    {Math.round(config.budgetClosenessThreshold * 100)}%
                  </Badge>
                </div>
                <Slider
                  id="budget"
                  min={10}
                  max={50}
                  step={5}
                  value={[config.budgetClosenessThreshold * 100]}
                  onValueChange={([value]) =>
                    setConfig((prev) => ({
                      ...prev,
                      budgetClosenessThreshold: value / 100,
                    }))
                  }
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Maximum percentage difference between movie budgets
                </p>
              </div>
            )}

            {isStreamingSupported && (
              <label className="flex items-start gap-2 cursor-pointer text-xs border border-gray-200 rounded-md p-2.5 hover:bg-gray-50">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={includeWebSearch}
                  onChange={(e) => setIncludeWebSearch(e.target.checked)}
                  disabled={isGenerating}
                />
                <div>
                  <div className="flex items-center gap-1 font-medium text-gray-800">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    Grounded (uses web search)
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Slower and more expensive; only turn on when you need
                    fresh citations. Off by default.
                  </div>
                </div>
              </label>
            )}

            <div className="border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs"
              >
                <Settings className="w-3 h-3 mr-1" />
                {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
              </Button>

              {showAdvanced && (
                <div className="space-y-3 mt-3">
                  <div className="space-y-1">
                    <Label htmlFor="recent" className="text-xs">
                      Avoid movies used in any game (days)
                    </Label>
                    <Input
                      id="recent"
                      type="number"
                      min={isStreamingSupported ? 30 : 7}
                      max={90}
                      value={config.avoidRecentDays}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          avoidRecentDays: parseInt(e.target.value) || 30,
                        }))
                      }
                      className="h-8 text-sm"
                    />
                    {isStreamingSupported && (
                      <p className="text-[11px] text-gray-500">
                        Also enforced server-side at save time (minimum 30 days).
                      </p>
                    )}
                  </div>

                  {!isStreamingSupported && (
                    <div className="space-y-1">
                      <Label htmlFor="samegame" className="text-xs">
                        Avoid movies used in {gameType} (days)
                      </Label>
                      <Input
                        id="samegame"
                        type="number"
                        min={30}
                        max={730}
                        value={config.avoidSameGameDays}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            avoidSameGameDays: parseInt(e.target.value) || 365,
                          }))
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  )}

                  {isStreamingSupported && (
                    <p className="text-[11px] text-gray-500">
                      Films used in {gameType} at any point are always excluded.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {activity.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-gray-500">
                <Activity className="w-3 h-3" />
                Activity
              </div>
              <ul className="max-h-40 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100 text-xs">
                {activity.map((entry) => (
                  <li
                    key={entry.id}
                    className="px-2 py-1.5 flex items-start gap-2"
                  >
                    <ActivityIcon variant={entry.variant} />
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          'text-gray-800',
                          entry.variant === 'error' ? 'font-medium' : 'truncate',
                        )}
                      >
                        {entry.label}
                      </div>
                      {entry.detail &&
                        (entry.variant === 'error' ? (
                          <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-[11px] leading-snug text-gray-600">
                            {entry.detail}
                          </pre>
                        ) : (
                          <div className="text-[11px] text-gray-500 break-words">
                            {entry.detail}
                          </div>
                        ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div>{error}</div>
                {errorDetail && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium opacity-90 hover:opacity-100">
                      Show diagnostic (schema issues + raw output)
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-red-950/10 p-2 text-[11px] leading-snug text-red-900">
                      {errorDetail}
                    </pre>
                  </details>
                )}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Puzzle generated successfully!
              </AlertDescription>
            </Alert>
          )}

          {suggestions.length > 0 && (
            <div className="space-y-2">
              <Label>Pick a suggested movie to prefill the editor</Label>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {suggestions.map((suggestion, idx) => (
                  <SuggestionCard
                    key={`${suggestion.movie.id}-${idx}`}
                    suggestion={suggestion}
                    onSelect={handleSelectSuggestion}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            {isGenerating ? (
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Cancel Generation
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            )}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || resolvingDate || !resolvedDate}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Puzzle
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SuggestionCard({
  suggestion,
  onSelect,
}: {
  suggestion: RichSuggestion
  onSelect: (s: RichSuggestion) => void
}) {
  const { movie, localizedTitle, reasoning, verdict } = suggestion
  return (
    <button
      onClick={() => onSelect(suggestion)}
      className={cn(
        'w-full text-left p-2.5 rounded-md border transition-colors',
        'hover:bg-gray-50 hover:border-purple-300',
        verdict === 'accepted'
          ? 'border-purple-200 bg-purple-50/40'
          : 'border-gray-200',
      )}
    >
      <div className="flex items-start gap-3">
        {movie.poster_path && (
          <picture>
            <img
              src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
              alt={movie.title}
              width={48}
              height={72}
              className="w-12 h-[72px] object-cover rounded flex-shrink-0"
            />
          </picture>
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-baseline gap-2">
            <div className="font-medium text-sm truncate">{movie.title}</div>
            {movie.release_year != null && (
              <div className="text-xs text-gray-500">{movie.release_year}</div>
            )}
          </div>
          {localizedTitle && (
            <div className="text-xs text-gray-700 space-y-0.5">
              <div>
                <span className="text-gray-500">Proposed:</span>{" "}
                <span className="italic">“{localizedTitle.title}”</span>{" "}
                <span className="text-gray-400">
                  ({localizedTitle.countryCode} — {localizedTitle.countryName})
                </span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-gray-500">Back-translates:</span>
                <span className="italic">“{localizedTitle.backTranslation}”</span>
                <Badge
                  variant={localizedTitle.similarity < 0.3 ? 'default' : 'secondary'}
                  className={cn(
                    'text-[10px] h-4 px-1.5',
                    localizedTitle.similarity < 0.3
                      ? 'bg-green-100 text-green-800 hover:bg-green-100'
                      : localizedTitle.similarity < 0.5
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                        : 'bg-gray-100 text-gray-800',
                  )}
                >
                  similarity {localizedTitle.similarity.toFixed(2)}
                </Badge>
              </div>
            </div>
          )}
          {reasoning && (
            <div className="text-[11px] text-gray-600 italic break-words">
              “{reasoning}”
            </div>
          )}
          {suggestion.reason && verdict === 'rejected' && (
            <div className="text-[11px] text-gray-500">
              Rejected: {suggestion.reason}
            </div>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
      </div>
    </button>
  )
}

function ActivityIcon({ variant }: { variant: ActivityEntry['variant'] }) {
  switch (variant) {
    case 'scored-ok':
      return <CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
    case 'scored-ko':
      return <AlertCircle className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
    case 'candidates':
      return <Sparkles className="w-3.5 h-3.5 text-purple-600 mt-0.5 flex-shrink-0" />
    case 'tool':
      return <Activity className="w-3.5 h-3.5 text-indigo-600 mt-0.5 flex-shrink-0" />
    case 'error':
      return <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
    default:
      return <ChevronRight className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
  }
}

/**
 * Convert a legacy (budget-bracket) `TMDBMovie[]` suggestions array into the
 * new rich `CandidateAttempt` shape so the UI can render them uniformly.
 */
function suggestionFromLegacy(list: Array<{
  id: number
  title: string
  poster_path?: string | null
  release_date?: string
}>): RichSuggestion[] {
  return list.map((movie) => {
    const releaseYear =
      typeof movie.release_date === 'string' && movie.release_date.length >= 4
        ? Number.parseInt(movie.release_date.slice(0, 4), 10)
        : null
    const attempt: CandidateAttempt = {
      movie: {
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path ?? null,
        release_year: Number.isFinite(releaseYear ?? NaN) ? releaseYear : null,
      },
      verdict: 'rejected',
    }
    return attempt
  })
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const name = (err as { name?: string }).name
  return name === 'AbortError'
}
