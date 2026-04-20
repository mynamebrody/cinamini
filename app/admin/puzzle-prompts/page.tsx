"use client"

import { useCallback, useEffect, useState } from "react"
import { Sparkles, Loader2, CheckCircle, AlertCircle, Save, Play, Plus } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface PromptRow {
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

interface Feedback {
  kind: "success" | "error"
  message: string
}

const GAME_TYPES = ["retitled", "cast-climb", "poster-pixels"] as const
const GAME_TYPE_LABELS: Record<(typeof GAME_TYPES)[number], string> = {
  retitled: "Retitled",
  "cast-climb": "Cast Climb",
  "poster-pixels": "Poster Pixels",
}

export default function PuzzlePromptsPage() {
  const [prompts, setPrompts] = useState<PromptRow[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [edits, setEdits] = useState<
    Record<string, { system: string; user: string; notes: string }>
  >({})
  const [newVersion, setNewVersion] = useState<
    Record<string, { system: string; user: string; notes: string; activate: boolean }>
  >({})

  const loadPrompts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/puzzles/prompts")
      const data = await res.json()
      if (!res.ok) {
        setFeedback({ kind: "error", message: data.error || "Failed to load prompts" })
        return
      }
      setPrompts(data.prompts as PromptRow[])
      const nextEdits: typeof edits = {}
      for (const row of data.prompts as PromptRow[]) {
        nextEdits[row.id] = {
          system: row.system_prompt,
          user: row.user_prompt_template,
          notes: row.notes ?? "",
        }
      }
      setEdits(nextEdits)
    } catch (err) {
      console.error(err)
      setFeedback({ kind: "error", message: "Network error loading prompts" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPrompts()
  }, [loadPrompts])

  const updateEdit = (
    id: string,
    patch: Partial<{ system: string; user: string; notes: string }>,
  ) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { system: "", user: "", notes: "" }), ...patch },
    }))
  }

  const saveEdits = async (row: PromptRow) => {
    const edit = edits[row.id]
    if (!edit) return
    setSavingId(row.id)
    setFeedback(null)
    try {
      const res = await fetch("/api/admin/puzzles/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          system_prompt: edit.system,
          user_prompt_template: edit.user,
          notes: edit.notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback({ kind: "error", message: data.error || "Failed to save" })
        return
      }
      setFeedback({ kind: "success", message: `Saved v${row.version} of ${row.game_type}.` })
      await loadPrompts()
    } finally {
      setSavingId(null)
    }
  }

  const activate = async (row: PromptRow) => {
    setSavingId(row.id)
    setFeedback(null)
    try {
      const res = await fetch("/api/admin/puzzles/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, action: "activate" }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback({ kind: "error", message: data.error || "Failed to activate" })
        return
      }
      setFeedback({
        kind: "success",
        message: `Activated v${row.version} for ${row.game_type}.`,
      })
      await loadPrompts()
    } finally {
      setSavingId(null)
    }
  }

  const updateNew = (
    gameType: string,
    patch: Partial<{ system: string; user: string; notes: string; activate: boolean }>,
  ) => {
    setNewVersion((prev) => ({
      ...prev,
      [gameType]: {
        system: prev[gameType]?.system ?? "",
        user: prev[gameType]?.user ?? "",
        notes: prev[gameType]?.notes ?? "",
        activate: prev[gameType]?.activate ?? false,
        ...patch,
      },
    }))
  }

  const createNewVersion = async (gameType: string) => {
    const draft = newVersion[gameType]
    if (!draft || !draft.system || !draft.user) {
      setFeedback({
        kind: "error",
        message: "Both system_prompt and user_prompt_template are required.",
      })
      return
    }
    setSavingId(gameType)
    setFeedback(null)
    try {
      const res = await fetch("/api/admin/puzzles/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_type: gameType,
          system_prompt: draft.system,
          user_prompt_template: draft.user,
          notes: draft.notes || null,
          activate: draft.activate,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback({ kind: "error", message: data.error || "Failed to create" })
        return
      }
      setFeedback({
        kind: "success",
        message: `Created v${data.prompt.version} for ${gameType}.`,
      })
      setNewVersion((prev) => ({
        ...prev,
        [gameType]: { system: "", user: "", notes: "", activate: false },
      }))
      await loadPrompts()
    } finally {
      setSavingId(null)
    }
  }

  const grouped = GAME_TYPES.map((gt) => ({
    gameType: gt,
    rows: prompts.filter((p) => p.game_type === gt),
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-funnel-display-bold text-neutral-900 mb-2 flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-cinema-red" />
          Puzzle Generator Prompts
        </h1>
        <p className="text-neutral-600 font-funnel max-w-3xl">
          Manage the system and user-prompt templates the smart puzzle generator
          passes to the configured OpenAI model (<code className="text-xs">OPENAI_PUZZLE_MODEL</code>).
          Only one version per game can be active at a time.
        </p>
      </div>

      {feedback && (
        <Alert
          className={
            feedback.kind === "success"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }
        >
          {feedback.kind === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-cinema-red" />
          )}
          <AlertTitle className={feedback.kind === "success" ? "text-green-800" : "text-red-800"}>
            {feedback.kind === "success" ? "Saved" : "Error"}
          </AlertTitle>
          <AlertDescription
            className={feedback.kind === "success" ? "text-green-700" : "text-red-700"}
          >
            {feedback.message}
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-600 font-funnel">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading prompts…
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(({ gameType, rows }) => (
            <section key={gameType} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-funnel-display-bold text-neutral-900">
                  {GAME_TYPE_LABELS[gameType]}
                </h2>
                <Badge variant="secondary">{rows.length} version{rows.length === 1 ? "" : "s"}</Badge>
              </div>

              {/* New version form */}
              <Card className="admin-card border-dashed">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-funnel-display-bold">
                    <Plus className="w-5 h-5 text-cinema-red" />
                    Create new version
                  </CardTitle>
                  <CardDescription className="font-funnel">
                    Drafts start inactive. Tick "activate on create" to promote it immediately.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="font-funnel font-medium">System prompt</Label>
                    <textarea
                      value={newVersion[gameType]?.system ?? ""}
                      onChange={(e) =>
                        updateNew(gameType, { system: e.target.value })
                      }
                      rows={5}
                      className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 font-mono text-xs"
                      placeholder="You are..."
                    />
                  </div>
                  <div>
                    <Label className="font-funnel font-medium">User prompt template</Label>
                    <textarea
                      value={newVersion[gameType]?.user ?? ""}
                      onChange={(e) => updateNew(gameType, { user: e.target.value })}
                      rows={6}
                      className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 font-mono text-xs"
                      placeholder="Find a film for {{target_date}} avoiding {{excluded_ids}}..."
                    />
                    <p className="text-xs text-neutral-500 mt-1 font-funnel">
                      Supported vars: <code>{"{{target_date}}"}</code>{" "}
                      <code>{"{{min_vote_count}}"}</code>{" "}
                      <code>{"{{excluded_ids}}"}</code>
                    </p>
                  </div>
                  <div>
                    <Label className="font-funnel font-medium">Notes</Label>
                    <Input
                      value={newVersion[gameType]?.notes ?? ""}
                      onChange={(e) => updateNew(gameType, { notes: e.target.value })}
                      placeholder="What's different about this version?"
                      className="mt-1"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm font-funnel">
                    <input
                      type="checkbox"
                      checked={newVersion[gameType]?.activate ?? false}
                      onChange={(e) =>
                        updateNew(gameType, { activate: e.target.checked })
                      }
                    />
                    Activate on create
                  </label>
                  <Button
                    disabled={savingId === gameType}
                    onClick={() => createNewVersion(gameType)}
                  >
                    {savingId === gameType ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating…
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create version
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {rows.length === 0 && (
                <p className="text-sm text-neutral-600 font-funnel">
                  No prompts yet. Create one above.
                </p>
              )}

              {rows.map((row) => {
                const edit = edits[row.id] ?? {
                  system: row.system_prompt,
                  user: row.user_prompt_template,
                  notes: row.notes ?? "",
                }
                const isDirty =
                  edit.system !== row.system_prompt ||
                  edit.user !== row.user_prompt_template ||
                  edit.notes !== (row.notes ?? "")
                return (
                  <Card key={row.id} className="admin-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 font-funnel-display-bold">
                        Version {row.version}
                        {row.is_active ? (
                          <Badge className="bg-green-600 hover:bg-green-700">active</Badge>
                        ) : (
                          <Badge variant="secondary">inactive</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="font-funnel text-xs">
                        Created {new Date(row.created_at).toLocaleString()} · Updated{" "}
                        {new Date(row.updated_at).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="font-funnel font-medium">System prompt</Label>
                        <textarea
                          value={edit.system}
                          onChange={(e) => updateEdit(row.id, { system: e.target.value })}
                          rows={5}
                          className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <Label className="font-funnel font-medium">User prompt template</Label>
                        <textarea
                          value={edit.user}
                          onChange={(e) => updateEdit(row.id, { user: e.target.value })}
                          rows={6}
                          className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <Label className="font-funnel font-medium">Notes</Label>
                        <Input
                          value={edit.notes}
                          onChange={(e) => updateEdit(row.id, { notes: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={savingId === row.id || !isDirty}
                          onClick={() => saveEdits(row)}
                        >
                          {savingId === row.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save changes
                            </>
                          )}
                        </Button>
                        {!row.is_active && (
                          <Button
                            variant="outline"
                            disabled={savingId === row.id}
                            onClick={() => activate(row)}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Make active
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
