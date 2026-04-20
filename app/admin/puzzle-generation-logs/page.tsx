"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  History,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  XCircle,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface LogRow {
  id: string
  admin_user_id: string | null
  game_type: string
  target_date: string
  model: string
  prompt_id: string | null
  prompt_version: number | null
  config: Record<string, unknown> | null
  excluded_count: number | null
  candidate_ids: number[] | null
  final_film_id: number | null
  outcome: "success" | "suggestions" | "error"
  duration_ms: number | null
  tokens_in: number | null
  tokens_out: number | null
  error: string | null
  created_at: string
}

interface LogsResponse {
  logs: LogRow[]
  total: number
  limit: number
  offset: number
}

const PAGE_SIZE = 25

export default function PuzzleGenerationLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [gameType, setGameType] = useState<string>("all")
  const [outcome, setOutcome] = useState<string>("all")

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set("limit", String(PAGE_SIZE))
    params.set("offset", String(offset))
    if (gameType !== "all") params.set("gameType", gameType)
    if (outcome !== "all") params.set("outcome", outcome)
    return params.toString()
  }, [offset, gameType, outcome])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/puzzles/generation-logs?${queryString}`)
      const data = (await res.json()) as LogsResponse & { error?: string }
      if (!res.ok) {
        setError(data.error || "Failed to load logs")
        return
      }
      setLogs(data.logs)
      setTotal(data.total)
    } catch (err) {
      console.error(err)
      setError("Network error loading logs")
    } finally {
      setLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setOffset(0)
  }, [gameType, outcome])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-funnel-display-bold text-neutral-900 mb-2 flex items-center gap-2">
          <History className="w-7 h-7 text-cinema-red" />
          Puzzle Generation Logs
        </h1>
        <p className="text-neutral-600 font-funnel max-w-3xl">
          One row per smart-generation attempt. Shows the model and prompt
          version used, exclusion size, candidate ids returned by the LLM, and
          the final outcome.
        </p>
      </div>

      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between font-funnel-display-bold">
            <span>Filters</span>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="font-funnel font-medium">Game type</Label>
            <Select value={gameType} onValueChange={setGameType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-md z-50">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="retitled">Retitled</SelectItem>
                <SelectItem value="cast-climb">Cast Climb</SelectItem>
                <SelectItem value="poster-pixels">Poster Pixels</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="font-funnel font-medium">Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-md z-50">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="suggestions">Suggestions</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-neutral-600 font-funnel">
              {total} total · page {currentPage} / {totalPages}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md p-3 text-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-600 font-funnel">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading logs…
        </div>
      ) : logs.length === 0 ? (
        <Card className="admin-card">
          <CardContent className="py-10 text-center text-neutral-600 font-funnel">
            No logs match the current filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((row) => (
            <LogCard key={row.id} row={row} />
          ))}
        </div>
      )}

      <div className="flex justify-between">
        <Button
          variant="outline"
          disabled={offset === 0 || loading}
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
        >
          ← Previous
        </Button>
        <Button
          variant="outline"
          disabled={offset + PAGE_SIZE >= total || loading}
          onClick={() => setOffset(offset + PAGE_SIZE)}
        >
          Next →
        </Button>
      </div>
    </div>
  )
}

function LogCard({ row }: { row: LogRow }) {
  const outcomeBadge =
    row.outcome === "success" ? (
      <Badge className="bg-green-600 hover:bg-green-700 gap-1">
        <CheckCircle className="w-3 h-3" />
        success
      </Badge>
    ) : row.outcome === "suggestions" ? (
      <Badge className="bg-amber-500 hover:bg-amber-600 gap-1">
        <AlertCircle className="w-3 h-3" />
        suggestions
      </Badge>
    ) : (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="w-3 h-3" />
        error
      </Badge>
    )

  return (
    <Card className="admin-card">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-funnel-display-bold flex flex-wrap items-center gap-2">
            <span>{row.game_type}</span>
            <Badge variant="secondary">{row.target_date}</Badge>
            {outcomeBadge}
          </CardTitle>
          <div className="text-xs text-neutral-500 font-funnel">
            {new Date(row.created_at).toLocaleString()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm font-funnel">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-neutral-700">
          <div>
            <span className="text-neutral-500">Model:</span> <code>{row.model}</code>
          </div>
          <div>
            <span className="text-neutral-500">Prompt:</span>{" "}
            {row.prompt_version !== null ? `v${row.prompt_version}` : "—"}
          </div>
          <div>
            <span className="text-neutral-500">Duration:</span>{" "}
            {row.duration_ms !== null ? `${row.duration_ms}ms` : "—"}
          </div>
          <div>
            <span className="text-neutral-500">Excluded:</span> {row.excluded_count ?? "—"}
          </div>
          <div>
            <span className="text-neutral-500">Tokens in:</span> {row.tokens_in ?? "—"}
          </div>
          <div>
            <span className="text-neutral-500">Tokens out:</span> {row.tokens_out ?? "—"}
          </div>
          <div>
            <span className="text-neutral-500">Final film:</span>{" "}
            {row.final_film_id ?? "—"}
          </div>
          <div>
            <span className="text-neutral-500">Candidates:</span>{" "}
            {row.candidate_ids?.length ?? 0}
          </div>
        </div>
        {row.candidate_ids && row.candidate_ids.length > 0 && (
          <div className="text-xs text-neutral-600">
            <span className="text-neutral-500">IDs:</span>{" "}
            <code>{row.candidate_ids.join(", ")}</code>
          </div>
        )}
        {row.error && (
          <div className="text-xs bg-red-50 border border-red-200 rounded-md p-2 text-red-800 break-words">
            {row.error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
