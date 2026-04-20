"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  Film,
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
import {
  streamSmartGeneration,
  isAbortError as isSmartGenAbortError,
} from "@/lib/admin/smart-gen-stream"

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

/**
 * UI state machine for the admin-pick smart-gen flow.
 *
 *   'idle'     — dialog open, no stream running. Settings panel is primary.
 *   'picking'  — phase-1 stream running or the card list is awaiting a click.
 *                Cards progressively enrich as candidate-scored events arrive.
 *   'building' — admin picked a card; phase-2 stream is running with
 *                forcedFilmId, will terminate with success / rejection.
 */
type DialogPhase = 'idle' | 'picking' | 'building'

/**
 * One card in the candidate picker. We seed with whatever the `candidates`
 * event carries (id + optional model reasoning), hydrate with basic TMDB
 * details via `/api/movies/{id}/details`, and then enrich with the full
 * `CandidateAttempt` once `candidate-scored` lands.
 */
interface CandidateCardState {
  id: number
  title?: string
  posterPath?: string | null
  releaseYear?: number | null
  reasoning?: string
  status: 'pending' | 'inspecting' | 'accepted' | 'rejected'
  /** Full attempt data once candidate-scored arrives. */
  attempt?: CandidateAttempt
  /** Rejection reason — either from inspection or from a failed phase-2 build. */
  rejectionReason?: string
}

/**
 * Defaults for the dialog's tunable knobs. `minVoteCount` filters candidates
 * with fewer than this many TMDB votes — 1000 admits every household-name
 * film (Godfather ~22k, Jaws ~11k) while keeping out student / regional
 * shorts. The dialog resets `config` to this object every time it opens so
 * one accidental tweak can't stick across runs.
 */
interface DialogConfig {
  minVoteCount: number
  budgetClosenessThreshold: number
  avoidRecentDays: number
  avoidSameGameDays: number
}

const DEFAULT_DIALOG_CONFIG: DialogConfig = {
  minVoteCount: 1000,
  budgetClosenessThreshold: 0.3,
  avoidRecentDays: 30,
  avoidSameGameDays: 365,
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

/**
 * Convert cached `CandidateAttempt[]` into the `CandidateCardState[]`
 * shape the picker renders. Status comes straight from `attempt.verdict`;
 * rejection reason, TMDB basics, and model reasoning all carry over. No
 * network requests — everything the picker needs is in the attempt row.
 */
function attemptsToCards(attempts: CandidateAttempt[]): CandidateCardState[] {
  return attempts.map((attempt) => ({
    id: attempt.movie.id,
    title: attempt.movie.title,
    posterPath: attempt.movie.poster_path,
    releaseYear: attempt.movie.release_year ?? null,
    reasoning: attempt.reasoning,
    status: attempt.verdict === 'accepted' ? 'accepted' : 'rejected',
    attempt,
    rejectionReason: attempt.verdict === 'rejected' ? attempt.reason : undefined,
  }))
}

/** Human-friendly relative time ("2 min ago", "3 h ago", "1 d ago"). */
function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const diffMs = Date.now() - then
  if (diffMs < 0) return 'just now'
  const sec = Math.round(diffMs / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} h ago`
  const days = Math.round(hr / 24)
  return `${days} d ago`
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

  const [config, setConfig] = useState<DialogConfig>({
    ...DEFAULT_DIALOG_CONFIG,
  })
  const [includeWebSearch, setIncludeWebSearch] = useState(false)

  const [meta, setMeta] = useState<GenerateMeta>({})
  const [suggestions, setSuggestions] = useState<RichSuggestion[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  const [phase, setPhase] = useState<DialogPhase>('idle')
  const [candidateCards, setCandidateCards] = useState<CandidateCardState[]>([])
  const [buildingForId, setBuildingForId] = useState<number | null>(null)

  /**
   * Snapshot of the cached candidate row the dialog opened on, or `null`
   * when we showed the live picker. Used to:
   *   - render the "Showing cached candidates from Xm ago" banner
   *   - badge mismatches when the current targetDate / config differ from
   *     what the cache was written against
   *   - distinguish the cache-hit UX (no Generate button, only Regenerate
   *     in the banner) from the live-picker UX.
   */
  const [cacheMeta, setCacheMeta] = useState<{
    createdAt: string
    targetDate: string | null
    configSnapshot: Partial<DialogConfig> | null
  } | null>(null)
  /** Loading indicator for the cache fetch on open. */
  const [cacheLoading, setCacheLoading] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const activityIdRef = useRef(0)
  /** Separate controller so closing the dialog cancels the cache fetch. */
  const cacheAbortRef = useRef<AbortController | null>(null)
  // Mirror of `phase` / `buildingForId` — handleStreamEvent is invoked
  // synchronously from the NDJSON parser and can't wait for setState to
  // flush. Refs give it a stable, up-to-date view of the current phase.
  const phaseRef = useRef<DialogPhase>('idle')
  const buildingForIdRef = useRef<number | null>(null)

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

  // Reset tunable knobs AND picker state every time the dialog opens. Without
  // this, a one-off tweak (e.g. a preset vote-count chip in a previous life
  // of the component) would stick across runs, and old candidate cards from
  // a closed-but-remounted dialog would render stale.
  useEffect(() => {
    if (open) {
      setConfig({ ...DEFAULT_DIALOG_CONFIG })
      setCandidateCards([])
      setBuildingForId(null)
      buildingForIdRef.current = null
      setPhase('idle')
      phaseRef.current = 'idle'
      setSuggestions([])
      setActivity([])
      setError(null)
      setErrorDetail(null)
      setSuccess(false)
      setCacheMeta(null)
    }
  }, [open])

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
    if (!open && cacheAbortRef.current) {
      cacheAbortRef.current.abort()
      cacheAbortRef.current = null
    }
  }, [open])

  /**
   * Load the latest cached candidate list for this game type when the
   * dialog opens. On hit, seed the picker with cached cards so the admin
   * sees options instantly; on miss, stay in 'idle' so the Smart Generate
   * button is the primary action.
   *
   * Skipped for budget-bracket (no candidate picker) and when a forced
   * film id is driving the dialog (not applicable here — forced-id runs
   * happen from the editors, not from this dialog). Config/date mismatches
   * are surfaced as banner pills in the UI; they do not prevent reuse.
   */
  useEffect(() => {
    if (!open) return
    if (!isStreamingSupported) return

    const controller = new AbortController()
    cacheAbortRef.current = controller
    setCacheLoading(true)

    ;(async () => {
      try {
        const res = await fetch(
          `/api/admin/puzzles/candidate-cache?gameType=${gameType}`,
          { signal: controller.signal },
        )
        if (!res.ok) {
          setCacheLoading(false)
          return
        }
        const data = (await res.json()) as
          | { hit: false }
          | {
              hit: true
              attempts: CandidateAttempt[]
              createdAt: string
              targetDate: string | null
              configSnapshot: Partial<DialogConfig> | null
            }
        if (controller.signal.aborted) return

        if (data.hit) {
          const cards = attemptsToCards(data.attempts)
          if (cards.length > 0) {
            setCandidateCards(cards)
            setPhase('picking')
            phaseRef.current = 'picking'
            setCacheMeta({
              createdAt: data.createdAt,
              targetDate: data.targetDate,
              configSnapshot: data.configSnapshot,
            })
          }
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
        console.warn('[SmartGenerationDialog] cache fetch failed:', err)
      } finally {
        if (!controller.signal.aborted) setCacheLoading(false)
      }
    })()

    return () => {
      controller.abort()
    }
  }, [open, gameType, isStreamingSupported])

  const displayDate = useMemo(
    () => (resolvedDate ? formatDisplayDate(resolvedDate) : ""),
    [resolvedDate],
  )

  /**
   * Warnings to surface on the cache banner. Cache key is `game_type` only
   * so a mismatched `target_date` / `config` snapshot doesn't invalidate
   * the cards — but the admin should know the cards were generated against
   * different inputs so an unexpected phase-2 rejection or a regenerate
   * impulse isn't surprising.
   */
  const cacheMismatches = useMemo<string[]>(() => {
    if (!cacheMeta) return []
    const notes: string[] = []
    if (
      cacheMeta.targetDate &&
      resolvedDate &&
      cacheMeta.targetDate !== resolvedDate
    ) {
      notes.push(
        `Cached for ${formatDisplayDate(cacheMeta.targetDate)}; current slot is ${formatDisplayDate(resolvedDate)}`,
      )
    }
    const cachedVotes = cacheMeta.configSnapshot?.minVoteCount
    if (
      typeof cachedVotes === 'number' &&
      cachedVotes !== config.minVoteCount
    ) {
      notes.push(
        `Min votes was ${cachedVotes.toLocaleString()} when cached; current is ${config.minVoteCount.toLocaleString()}`,
      )
    }
    return notes
  }, [cacheMeta, resolvedDate, config.minVoteCount])

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
    // If we cancel during a phase-2 build, keep the picker visible so the
    // admin can choose a different film. If we cancel during phase 1, drop
    // back to idle so the Generate button reactivates cleanly.
    if (phaseRef.current === 'building') {
      setBuildingForId(null)
      buildingForIdRef.current = null
      setPhase('picking')
      phaseRef.current = 'picking'
    } else {
      setPhase('idle')
      phaseRef.current = 'idle'
    }
  }

  /**
   * Fetch basic TMDB details for each candidate id so the skeleton cards
   * can render something useful (title / poster / year) before the
   * per-candidate `candidate-scored` event arrives with the full attempt.
   *
   * Fire-and-forget: `candidate-scored` will overwrite these fields with
   * the authoritative values, so any failures here just leave the card as
   * "Inspecting…" until the server catches up.
   */
  const hydrateCandidateCards = useCallback(
    (ids: number[], signal: AbortSignal) => {
      for (const id of ids) {
        fetch(`/api/movies/${id}/details`, { signal })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!data) return
            const releaseYear =
              typeof data.release_date === 'string' &&
              data.release_date.length >= 4
                ? Number.parseInt(data.release_date.slice(0, 4), 10)
                : null
            setCandidateCards((prev) =>
              prev.map((card) =>
                card.id === id
                  ? {
                      ...card,
                      title: card.title ?? data.title,
                      posterPath: card.posterPath ?? data.poster_path ?? null,
                      releaseYear:
                        card.releaseYear ??
                        (Number.isFinite(releaseYear) ? releaseYear : null),
                    }
                  : card,
              ),
            )
          })
          .catch(() => {
            // ignore — candidate-scored will fill these fields anyway.
          })
      }
    },
    [],
  )

  /**
   * Translate one `GenerationEvent` into activity-feed + picker-state
   * updates. Shared across phase 1 (picker) and phase 2 (build) because
   * most events mean the same thing in both; the phase-specific branches
   * look at `phaseRef.current` / `buildingForIdRef.current` for context.
   */
  const handleStreamEvent = useCallback(
    (event: GenerationEvent) => {
      switch (event.kind) {
        case 'status':
          pushActivity({
            label: event.label,
            detail: event.detail,
            variant: 'status',
          })
          break
        case 'model-text-delta':
          // too noisy for the feed
          break
        case 'tool-call':
          pushActivity({
            label: `Tool call: ${event.name}`,
            variant: 'tool',
          })
          break
        case 'candidates': {
          pushActivity({
            label: `Model proposed ${event.ids.length} candidate${event.ids.length === 1 ? '' : 's'}`,
            detail: event.reasoning,
            variant: 'candidates',
          })
          // Only seed picker cards in phase 1 — a phase-2 run's `candidates`
          // event is always a single forced id, which doesn't need a picker.
          if (phaseRef.current === 'picking') {
            const items: Array<{ id: number; reasoning?: string }> =
              event.items ?? event.ids.map((id) => ({ id }))
            const seeded: CandidateCardState[] = items.map((item) => ({
              id: item.id,
              reasoning: item.reasoning,
              status: 'inspecting',
            }))
            setCandidateCards(seeded)
            // hydrate TMDB basics in parallel so cards aren't empty while
            // the model/TMDB pipeline works through its batches.
            if (abortRef.current) {
              hydrateCandidateCards(event.ids, abortRef.current.signal)
            }
          }
          break
        }
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
          // Merge the enriched attempt into the matching picker card. Also
          // handle the edge case where the model's `candidates` event
          // didn't list this id (shouldn't happen but keeps the feed and
          // picker in sync).
          if (phaseRef.current === 'picking') {
            setCandidateCards((prev) => {
              const next = prev.slice()
              const idx = next.findIndex((card) => card.id === a.movie.id)
              const merged: CandidateCardState = {
                id: a.movie.id,
                title: a.movie.title,
                posterPath: a.movie.poster_path,
                releaseYear: a.movie.release_year ?? null,
                reasoning: a.reasoning ?? prev[idx]?.reasoning,
                status: ok ? 'accepted' : 'rejected',
                attempt: a,
                rejectionReason: ok ? undefined : a.reason,
              }
              if (idx === -1) {
                next.push(merged)
              } else {
                next[idx] = merged
              }
              return next
            })
          }
          break
        }
        case 'candidates-ready':
          // Phase-1 terminal event: every candidate has been inspected.
          // The UI stays in 'picking' waiting for the admin to click a card.
          pushActivity({
            label: `Inspected ${event.attempts.length} candidate${event.attempts.length === 1 ? '' : 's'}`,
            detail: 'Pick one to build the puzzle.',
            variant: 'status',
          })
          break
        case 'suggestions': {
          // Phase 2: the admin's picked film failed the full pipeline
          // (e.g. Retitled couldn't assemble 4 distractors). Flip the card
          // to rejected, surface the reason, and return to the picker.
          if (
            phaseRef.current === 'building' &&
            buildingForIdRef.current !== null
          ) {
            const pickedId = buildingForIdRef.current
            const reason = event.error || 'Build failed for this film.'
            setCandidateCards((prev) =>
              prev.map((card) =>
                card.id === pickedId
                  ? {
                      ...card,
                      status: 'rejected',
                      rejectionReason: reason,
                    }
                  : card,
              ),
            )
            setBuildingForId(null)
            buildingForIdRef.current = null
            setPhase('picking')
            phaseRef.current = 'picking'
            setError(reason)
            break
          }
          // Phase-1 fallback: the LLM itself returned no candidates, so the
          // strategy threw `StrategyNoneEligibleError`. Render the legacy
          // suggestion list so the admin can still pick something.
          setSuggestions(event.suggestions)
          setError(
            event.error ||
              'Could not generate puzzle automatically. Here are some suggestions:',
          )
          break
        }
        case 'exclusion_conflict':
          // Only the forced-film (phase 2 / editor auto-run) path reaches
          // this. If we're mid-build, flip the card; otherwise just show
          // the reason as a plain error.
          if (
            phaseRef.current === 'building' &&
            buildingForIdRef.current !== null
          ) {
            const pickedId = buildingForIdRef.current
            const reason = `Excluded: ${event.reason}`
            setCandidateCards((prev) =>
              prev.map((card) =>
                card.id === pickedId
                  ? { ...card, status: 'rejected', rejectionReason: reason }
                  : card,
              ),
            )
            setBuildingForId(null)
            buildingForIdRef.current = null
            setPhase('picking')
            phaseRef.current = 'picking'
            setError(reason)
          } else {
            setError(
              `This film (TMDB ${event.forcedFilmId}) can't be used right now: ${event.reason}`,
            )
          }
          break
        case 'success':
          setSuccess(true)
          onGenerate({ ...(event.puzzle as object), puzzle_date: resolvedDate })
          setPhase('idle')
          phaseRef.current = 'idle'
          setTimeout(() => {
            setOpen(false)
            setSuccess(false)
          }, 1500)
          break
        case 'error': {
          const message = event.error
          const detail = 'detail' in event ? event.detail : undefined
          if (detail) {
            setErrorDetail(detail)
            pushActivity({
              variant: 'error',
              label: message,
              detail,
            })
          }
          if (
            phaseRef.current === 'building' &&
            buildingForIdRef.current !== null
          ) {
            const pickedId = buildingForIdRef.current
            setCandidateCards((prev) =>
              prev.map((card) =>
                card.id === pickedId
                  ? { ...card, status: 'rejected', rejectionReason: message }
                  : card,
              ),
            )
            setBuildingForId(null)
            buildingForIdRef.current = null
            setPhase('picking')
            phaseRef.current = 'picking'
          }
          setError(message)
          break
        }
        case 'aborted':
          // cancel handler already updated UI state; nothing to do here.
          break
        case 'done':
          break
      }
    },
    [hydrateCandidateCards, onGenerate, resolvedDate],
  )

  const handleGenerate = async () => {
    if (!resolvedDate) {
      setError('No puzzle date available. Please set one manually.')
      return
    }

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
    setCandidateCards([])
    setBuildingForId(null)
    buildingForIdRef.current = null
    // Clear the cache banner so it doesn't linger next to a now-stale
    // timestamp while the regenerate stream is running. When the new
    // phase-1 finishes the server writes a fresh cache row, but the
    // dialog's own state is authoritative from this point on until it
    // reopens, so we don't re-show the banner mid-run.
    setCacheMeta(null)

    if (!isStreamingSupported) {
      // Budget-bracket still uses the legacy non-streaming JSON path and
      // doesn't benefit from the manual-pick picker.
      setPhase('idle')
      phaseRef.current = 'idle'
      const payload = {
        gameType,
        targetDate: resolvedDate,
        config,
        includeWebSearch,
      }
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
        if (isSmartGenAbortError(err)) return
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        setIsGenerating(false)
        abortRef.current = null
      }
      return
    }

    setPhase('picking')
    phaseRef.current = 'picking'

    try {
      await streamSmartGeneration({
        gameType,
        targetDate: resolvedDate,
        includeWebSearch,
        config,
        selectionMode: 'manual',
        signal: controller.signal,
        onEvent: handleStreamEvent,
      })
    } catch (err) {
      if (isSmartGenAbortError(err)) return
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsGenerating(false)
      abortRef.current = null
    }
  }

  /**
   * Phase 2: the admin picked a card. Run the full puzzle-build pipeline
   * for that film via `forcedFilmId` + `selectionMode: 'auto'`. The event
   * handler is shared with phase 1, so the switch / merge logic in
   * `handleStreamEvent` handles success / suggestions / error uniformly.
   */
  const handleSelectCandidate = useCallback(
    async (id: number) => {
      if (!resolvedDate) return

      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsGenerating(true)
      setError(null)
      setErrorDetail(null)
      setBuildingForId(id)
      buildingForIdRef.current = id
      setPhase('building')
      phaseRef.current = 'building'
      setCandidateCards((prev) =>
        prev.map((card) =>
          card.id === id ? { ...card, status: 'inspecting', rejectionReason: undefined } : card,
        ),
      )

      try {
        await streamSmartGeneration({
          gameType,
          targetDate: resolvedDate,
          includeWebSearch,
          config,
          forcedFilmId: id,
          selectionMode: 'auto',
          signal: controller.signal,
          onEvent: handleStreamEvent,
        })
      } catch (err) {
        if (isSmartGenAbortError(err)) return
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        setIsGenerating(false)
        abortRef.current = null
      }
    },
    [resolvedDate, gameType, includeWebSearch, config, handleStreamEvent],
  )

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
                <Label htmlFor="min-votes">Minimum TMDB Votes</Label>
                <Badge variant="secondary">
                  {config.minVoteCount === 0
                    ? 'Any'
                    : config.minVoteCount.toLocaleString()}
                </Badge>
              </div>
              <Input
                id="min-votes"
                type="number"
                min={0}
                step={100}
                value={config.minVoteCount}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10)
                  setConfig((prev) => ({
                    ...prev,
                    minVoteCount: Number.isFinite(parsed)
                      ? Math.max(0, parsed)
                      : 0,
                  }))
                }}
                disabled={isGenerating}
                className="h-9"
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 0, label: 'Any' },
                  { value: 100, label: '100+' },
                  { value: 1000, label: '1,000+' },
                  { value: 5000, label: '5,000+' },
                ].map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    variant={
                      config.minVoteCount === preset.value
                        ? 'secondary'
                        : 'outline'
                    }
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        minVoteCount: preset.value,
                      }))
                    }
                    disabled={isGenerating}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Films with fewer TMDB votes are skipped.{' '}
                {config.minVoteCount === 0
                  ? 'Currently accepting any film with a poster.'
                  : `Currently requiring at least ${config.minVoteCount.toLocaleString()} votes. Set to 0 to disable.`}
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

          {cacheLoading && candidateCards.length === 0 && !isGenerating && (
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              Looking up cached candidates…
            </div>
          )}

          {cacheMeta && candidateCards.length > 0 && phase !== 'building' && (
            <div className="rounded-md border border-purple-200 bg-purple-50/60 p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs space-y-1 min-w-0">
                    <div className="text-purple-900 font-medium">
                      Showing cached candidates from{' '}
                      {formatRelativeTime(cacheMeta.createdAt)}
                    </div>
                    <div className="text-purple-800/80">
                      Click an accepted film to build the puzzle, or regenerate
                      to get a fresh list.
                    </div>
                    {cacheMismatches.length > 0 && (
                      <ul className="pt-1 space-y-0.5">
                        {cacheMismatches.map((note) => (
                          <li
                            key={note}
                            className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded"
                          >
                            <AlertCircle className="w-3 h-3" />
                            {note}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={isGenerating || resolvingDate || !resolvedDate}
                  className="border-purple-300 text-purple-700 hover:bg-purple-100"
                >
                  <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                  Regenerate
                </Button>
              </div>
            </div>
          )}

          {candidateCards.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm">
                  {phase === 'building'
                    ? 'Building puzzle…'
                    : 'Pick a candidate to build the puzzle'}
                </Label>
                {phase === 'picking' && isGenerating && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Inspecting…
                  </span>
                )}
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {candidateCards.map((card) => (
                  <CandidateCardButton
                    key={card.id}
                    card={card}
                    gameType={gameType}
                    disabled={phase === 'building'}
                    isBuildingThisCard={buildingForId === card.id}
                    onSelect={handleSelectCandidate}
                  />
                ))}
              </div>
              {phase === 'picking' && !isGenerating && !cacheMeta && (
                <p className="text-[11px] text-gray-500">
                  Click an accepted film to run the full puzzle-build pipeline.
                  Re-run Smart Generate to get a fresh candidate list.
                </p>
              )}
            </div>
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
                {phase === 'building' ? 'Cancel Build' : 'Cancel Generation'}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            )}
            {/*
             * On a cache hit (cacheMeta set + cards visible) the banner's
             * "Regenerate" button is the primary action, so we hide this
             * main button to avoid two competing Generate affordances. We
             * keep it visible during an active stream (so the spinner has
             * a home) and on a live-picker post-stream (where "Re-run" is
             * the discoverable regenerate control).
             */}
            {!(cacheMeta && candidateCards.length > 0 && !isGenerating) && (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || resolvingDate || !resolvedDate}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {phase === 'building' ? 'Building…' : 'Finding candidates…'}
                  </>
                ) : candidateCards.length > 0 && phase === 'picking' ? (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Re-run Smart Generate
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Smart Generate
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Progressive picker card rendered during manual-mode Smart Generate.
 *
 * The card moves through up to four states as data arrives:
 *
 *   pending / inspecting — seeded from the `candidates` event; basic TMDB
 *     metadata may already be hydrated but no verdict yet.
 *   accepted — `candidate-scored` verdict is 'accepted'; clickable to
 *     run the full phase-2 puzzle-build pipeline.
 *   rejected — either the inspection rejected it (ineligible / no distractors
 *     / no poster / etc.) or an admin-picked phase-2 build failed. The card
 *     is non-interactive and shows the reason.
 */
function CandidateCardButton({
  card,
  gameType,
  disabled,
  isBuildingThisCard,
  onSelect,
}: {
  card: CandidateCardState
  gameType: SmartGenerationDialogProps['gameType']
  /** True while a phase-2 build is in flight anywhere in the picker. */
  disabled: boolean
  /** True when this particular card is the one being built. */
  isBuildingThisCard: boolean
  onSelect: (id: number) => void
}) {
  const { status, title, posterPath, releaseYear, reasoning, attempt } = card
  const isClickable = status === 'accepted' && !disabled
  const isRejected = status === 'rejected'
  const displayTitle = title ?? attempt?.movie.title ?? `TMDB #${card.id}`

  const borderClass = isBuildingThisCard
    ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-300'
    : status === 'accepted'
      ? 'border-purple-200 bg-purple-50/40 hover:bg-purple-50 hover:border-purple-400'
      : isRejected
        ? 'border-gray-200 bg-gray-50/60 opacity-75'
        : 'border-gray-200 bg-white'

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={isClickable ? () => onSelect(card.id) : undefined}
      className={cn(
        'w-full text-left p-2.5 rounded-md border transition-colors',
        borderClass,
        !isClickable && 'cursor-default',
      )}
    >
      <div className="flex items-start gap-3">
        <CandidatePoster posterPath={posterPath} title={displayTitle} />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-baseline gap-2">
            <div
              className={cn(
                'font-medium text-sm truncate',
                isRejected && 'text-gray-500 line-through',
              )}
            >
              {displayTitle}
            </div>
            {releaseYear != null && (
              <div className="text-xs text-gray-500">{releaseYear}</div>
            )}
            <StatusBadge
              status={status}
              isBuildingThisCard={isBuildingThisCard}
            />
          </div>

          {reasoning && status !== 'rejected' && (
            <div className="text-[11px] text-gray-600 italic break-words">
              “{reasoning}”
            </div>
          )}

          {/* Retitled-specific: localized title preview */}
          {gameType === 'retitled' && attempt?.localizedTitle && (
            <div className="text-xs text-gray-700 space-y-0.5">
              <div>
                <span className="text-gray-500">Proposed:</span>{' '}
                <span className="italic">“{attempt.localizedTitle.title}”</span>{' '}
                <span className="text-gray-400">
                  ({attempt.localizedTitle.countryCode} —{' '}
                  {attempt.localizedTitle.countryName})
                </span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-gray-500">Back-translates:</span>
                <span className="italic">
                  “{attempt.localizedTitle.backTranslation}”
                </span>
                <Badge
                  variant={
                    attempt.localizedTitle.similarity < 0.3
                      ? 'default'
                      : 'secondary'
                  }
                  className={cn(
                    'text-[10px] h-4 px-1.5',
                    attempt.localizedTitle.similarity < 0.3
                      ? 'bg-green-100 text-green-800 hover:bg-green-100'
                      : attempt.localizedTitle.similarity < 0.5
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                        : 'bg-gray-100 text-gray-800',
                  )}
                >
                  similarity {attempt.localizedTitle.similarity.toFixed(2)}
                </Badge>
              </div>
            </div>
          )}

          {/* Cast Climb-specific: preview the 4 billed actors picked */}
          {gameType === 'cast-climb' &&
            attempt?.actors &&
            attempt.actors.length > 0 && (
              <div className="flex items-center gap-1.5 pt-0.5">
                {attempt.actors.slice(0, 4).map((actor) => (
                  <div
                    key={actor.id}
                    className="flex flex-col items-center w-12"
                    title={`${actor.name}${actor.character ? ` — ${actor.character}` : ''}`}
                  >
                    {actor.profile_path ? (
                      <picture>
                        <img
                          src={`https://image.tmdb.org/t/p/w92${actor.profile_path}`}
                          alt={actor.name}
                          width={32}
                          height={32}
                          className="w-8 h-8 object-cover rounded-full"
                        />
                      </picture>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <Film className="w-3 h-3 text-gray-500" />
                      </div>
                    )}
                    <div className="text-[10px] text-gray-600 mt-0.5 truncate w-full text-center">
                      {actor.name.split(' ').slice(-1)[0]}
                    </div>
                  </div>
                ))}
              </div>
            )}

          {/* Poster Pixels-specific: confirm we resolved a poster URL */}
          {gameType === 'poster-pixels' && status === 'accepted' && (
            <div className="text-[11px] text-gray-500">
              Poster resolved · ready to build
            </div>
          )}

          {isRejected && card.rejectionReason && (
            <div className="text-[11px] text-red-600">
              Rejected: {card.rejectionReason}
            </div>
          )}
          {status === 'inspecting' && (
            <div className="text-[11px] text-gray-500 inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Inspecting…
            </div>
          )}
        </div>
        {isClickable && (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
        )}
      </div>
    </button>
  )
}

function CandidatePoster({
  posterPath,
  title,
}: {
  posterPath?: string | null
  title: string
}) {
  if (posterPath) {
    return (
      <picture>
        <img
          src={`https://image.tmdb.org/t/p/w92${posterPath}`}
          alt={title}
          width={48}
          height={72}
          className="w-12 h-[72px] object-cover rounded flex-shrink-0"
        />
      </picture>
    )
  }
  return (
    <div className="w-12 h-[72px] rounded flex-shrink-0 bg-gray-100 border border-gray-200 flex items-center justify-center">
      <Film className="w-4 h-4 text-gray-400" />
    </div>
  )
}

function StatusBadge({
  status,
  isBuildingThisCard,
}: {
  status: CandidateCardState['status']
  isBuildingThisCard: boolean
}) {
  if (isBuildingThisCard) {
    return (
      <Badge
        variant="secondary"
        className="text-[10px] h-4 px-1.5 bg-purple-100 text-purple-800 hover:bg-purple-100 ml-auto"
      >
        <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />
        Building
      </Badge>
    )
  }
  switch (status) {
    case 'pending':
    case 'inspecting':
      return (
        <Badge
          variant="secondary"
          className="text-[10px] h-4 px-1.5 bg-gray-100 text-gray-700 ml-auto"
        >
          Pending
        </Badge>
      )
    case 'accepted':
      return (
        <Badge
          variant="secondary"
          className="text-[10px] h-4 px-1.5 bg-green-100 text-green-800 hover:bg-green-100 ml-auto"
        >
          Accepted
        </Badge>
      )
    case 'rejected':
      return (
        <Badge
          variant="secondary"
          className="text-[10px] h-4 px-1.5 bg-red-50 text-red-700 hover:bg-red-50 ml-auto"
        >
          Rejected
        </Badge>
      )
  }
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
