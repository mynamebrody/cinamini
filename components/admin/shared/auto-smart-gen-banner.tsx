"use client"

/**
 * Inline banner rendered at the top of each movie-based puzzle editor when
 * the admin deep-links via `/admin/puzzle-editor?movieId=<id>`.
 *
 * Visual language borrows from `SmartGenerationDialog`'s activity feed
 * (status rows, spinner, Stop button) but without the modal chrome — the
 * auto-run is inline and non-blocking so the admin can still edit other
 * fields while the pipeline runs.
 *
 * Rendered states:
 *   - `running`  — spinner + latest activity lines + Stop button
 *   - `excluded` — red banner with exclusion reason + "Choose another
 *                   movie" button (clears prefilledMovieId)
 *   - `failed`   — red banner with the generator's error text
 *   - `success`  — brief green flash; caller collapses the banner after
 *
 * `idle` is rendered as `null` (no banner).
 */

import {
  Activity,
  AlertCircle,
  CheckCircle,
  Loader2,
  StopCircle,
  Wand2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type AutoSmartGenState =
  | 'idle'
  | 'running'
  | 'success'
  | 'excluded'
  | 'failed'

export interface AutoSmartGenActivityEntry {
  id: string
  label: string
  detail?: string
  variant: 'status' | 'candidates' | 'scored-ok' | 'scored-ko' | 'tool' | 'error'
}

interface AutoSmartGenBannerProps {
  state: AutoSmartGenState
  gameLabel: string
  /** Latest activity lines. Caller controls ordering + length. */
  activity: AutoSmartGenActivityEntry[]
  /** Populated when `state === 'excluded'` or `'failed'`. */
  errorMessage?: string | null
  /** Optional extra diagnostic under the main error. */
  errorDetail?: string | null
  /** Fired when the admin clicks Stop during a running generation. */
  onStop?: () => void
  /**
   * Fired when the admin wants to dismiss an excluded/failed banner so
   * they can pick a different movie. The editor clears `prefilledMovieId`
   * and opens the manual movie selector in response.
   */
  onChangeMovie?: () => void
  /**
   * Fired when the admin explicitly dismisses a failed banner but keeps
   * the current movie (they'll pick manually inside the editor).
   */
  onDismiss?: () => void
  className?: string
}

export default function AutoSmartGenBanner({
  state,
  gameLabel,
  activity,
  errorMessage,
  errorDetail,
  onStop,
  onChangeMovie,
  onDismiss,
  className,
}: AutoSmartGenBannerProps) {
  if (state === 'idle') return null

  if (state === 'running') {
    const latest = activity[activity.length - 1]
    return (
      <div
        className={cn(
          "rounded-md border border-purple-300 bg-purple-50 p-3 text-sm",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <Loader2 className="mt-0.5 h-4 w-4 flex-shrink-0 animate-spin text-purple-700" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-medium text-purple-900">
              <Wand2 className="h-3.5 w-3.5" />
              Auto-generating {gameLabel}…
            </div>
            {latest ? (
              <div className="mt-1 text-xs text-purple-800">
                <div className="truncate">{latest.label}</div>
                {latest.detail && (
                  <div className="mt-0.5 truncate text-[11px] text-purple-700/80">
                    {latest.detail}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-1 text-xs text-purple-800/80">
                Warming up the generator…
              </div>
            )}
            {activity.length > 1 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] uppercase tracking-wide text-purple-700/70 hover:text-purple-900">
                  <span className="inline-flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    Activity ({activity.length})
                  </span>
                </summary>
                <ul className="mt-1 max-h-40 divide-y divide-purple-200/60 overflow-y-auto rounded border border-purple-200 bg-white text-xs">
                  {activity.slice(-20).map((entry) => (
                    <li key={entry.id} className="flex items-start gap-2 px-2 py-1.5">
                      <ActivityIcon variant={entry.variant} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-gray-800">{entry.label}</div>
                        {entry.detail && (
                          <div className="mt-0.5 break-words text-[11px] text-gray-500">
                            {entry.detail}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
          {onStop && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onStop}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <StopCircle className="mr-1 h-3.5 w-3.5" />
              Stop
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div
        className={cn(
          "rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle className="h-4 w-4 text-green-600" />
          {gameLabel} puzzle auto-generated. Review the fields below.
        </div>
      </div>
    )
  }

  const heading =
    state === 'excluded'
      ? "Can't auto-generate with this movie"
      : 'Auto-generation failed'

  return (
    <div
      className={cn(
        "rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900",
        className,
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{heading}</div>
          {errorMessage && (
            <div className="mt-1 break-words text-sm">{errorMessage}</div>
          )}
          {errorDetail && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium opacity-90 hover:opacity-100">
                Show diagnostic
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-red-100/50 p-2 text-[11px] leading-snug">
                {errorDetail}
              </pre>
            </details>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {onChangeMovie && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onChangeMovie}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Choose another movie
              </Button>
            )}
            {onDismiss && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-red-700 hover:bg-red-100"
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ActivityIcon({ variant }: { variant: AutoSmartGenActivityEntry['variant'] }) {
  switch (variant) {
    case 'scored-ok':
      return <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-600" />
    case 'scored-ko':
      return <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
    case 'candidates':
      return <Wand2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-purple-600" />
    case 'tool':
      return <Activity className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-indigo-600" />
    case 'error':
      return <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-600" />
    default:
      return <Activity className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
  }
}
