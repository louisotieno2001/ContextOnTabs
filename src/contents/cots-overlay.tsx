import type { PlasmoCSConfig } from "plasmo"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowRight, Maximize2, Minimize2, Plus, X } from "lucide-react"

import cssText from "data-text:~styles/globals.css"

import { createId } from "../lib/id"
import { loadGraph, saveGraph, loadSettings } from "../lib/storage"
import type { AiResponse, CotsEdge, CotsGraph, CotsNode, SelectionAnchor, Settings } from "../lib/types"
import { DEFAULT_SETTINGS } from "../lib/types"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

type DraftSelection = SelectionAnchor & {
  buttonX: number
  buttonY: number
}

type PanelState = {
  id: string
  sourceId: string
  title: string
  selection: SelectionAnchor
  x: number
  y: number
  width: number
  height: number
  minimized: boolean
  maximized: boolean
  loading: boolean
  response: string
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
  settings: Settings
}

function FollowUpInput({
  panel,
  updatePanels,
  isMaximized
}: {
  panel: PanelState
  updatePanels: (updater: (current: PanelState[]) => PanelState[]) => void
  isMaximized: boolean
}) {
  const [question, setQuestion] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!question.trim() || loading) return

      const userMessage = question.trim()
      setQuestion("")
      setLoading(true)

      updatePanels((current) =>
        current.map((p) =>
          p.id === panel.id
            ? {
              ...p,
              conversationHistory: [
                ...p.conversationHistory,
                { role: "user" as const, content: userMessage }
              ]
            }
            : p
        )
      )

      chrome.runtime.sendMessage(
        {
          type: "COTS_AI_REQUEST",
          payload: {
            selection: panel.selection,
            prompt: userMessage,
            conversationHistory: [
              ...panel.conversationHistory,
              { role: "user" as const, content: userMessage }
            ]
          }
        },
        (reply: { ok: boolean; result?: AiResponse; error?: string }) => {
          updatePanels((current) =>
            current.map((p) =>
              p.id === panel.id
                ? {
                  ...p,
                  conversationHistory: [
                    ...p.conversationHistory,
                    {
                      role: "assistant" as const,
                      content: reply?.ok
                        ? reply.result?.text ?? "No response"
                        : reply?.error ?? "Request failed"
                    }
                  ],
                  loading: false
                }
                : p
            )
          )
          setLoading(false)
        }
      )
    },
    [question, loading, panel, updatePanels]
  )

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-line/20 bg-paper p-3"
      onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a follow-up question..."
          className="flex-1 rounded-lg border border-line/20 bg-paper/50 px-3 py-2 text-xs text-text placeholder-text-dim focus:border-accent/50 focus:outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-paper transition-all hover:bg-accent/90 disabled:opacity-50">
          {loading ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-paper border-t-transparent" />
          ) : (
            <ArrowRight className="h-3 w-3" />
          )}
        </button>
      </div>
    </form>
  )
}

type DragState =
  | {
    type: "move"
    id: string
    startX: number
    startY: number
    panelX: number
    panelY: number
  }
  | {
    type: "resize"
    id: string
    startX: number
    startY: number
    width: number
    height: number
  }

function rectFromSelection(selection: Selection): DOMRect | null {
  if (!selection.rangeCount) {
    return null
  }

  const rect = selection.getRangeAt(0).getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) {
    return null
  }

  return rect
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function panelFromNode(node: CotsNode, settings: Settings): PanelState | null {
  if (!node.anchor || !node.panel) {
    return null
  }

  return {
    id: node.id,
    sourceId: node.panel.sourceId,
    title: node.label,
    selection: node.anchor,
    x: node.panel.x,
    y: node.panel.y,
    width: node.panel.width,
    height: node.panel.height,
    minimized: node.panel.minimized,
    maximized: node.panel.maximized ?? false,
    loading: false,
    response: "Saved panel restored. Ask follow-up questions using the input at the bottom.",
    conversationHistory: [],
    settings
  }
}

function CotsOverlay() {
  const [draft, setDraft] = useState<DraftSelection | null>(null)
  const [panels, setPanels] = useState<PanelState[]>([])
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [viewportVersion, setViewportVersion] = useState(0)
  const [globalSettings, setGlobalSettings] = useState<Settings>({ ...DEFAULT_SETTINGS })

  useEffect(() => {
    loadSettings().then((s) => {
      setGlobalSettings(s)
      loadGraph().then((graph) => {
        const restored = graph.nodes
          .filter((node) => node.kind === "ai-panel")
          .map((node) => panelFromNode(node, s))
          .filter(Boolean) as PanelState[]

        setPanels(restored)
      })
    })
  }, [])

  useEffect(() => {
    const onSelectionChange = () => {
      const selection = window.getSelection()
      const text = selection?.toString().trim()

      if (!selection || !text) {
        setDraft(null)
        return
      }

      const rect = rectFromSelection(selection)
      if (!rect) {
        setDraft(null)
        return
      }

      setDraft({
        text,
        pageTitle: document.title,
        pageUrl: window.location.href,
        rect: {
          x: rect.x + window.scrollX,
          y: rect.y + window.scrollY,
          width: rect.width,
          height: rect.height,
          top: rect.top + window.scrollY,
          right: rect.right + window.scrollX,
          bottom: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX
        },
        createdAt: new Date().toISOString(),
        buttonX: clamp(rect.right + window.scrollX + 10, 12, window.scrollX + window.innerWidth - 76),
        buttonY: clamp(rect.top + window.scrollY - 4, window.scrollY + 12, window.scrollY + window.innerHeight - 44)
      })
    }

    document.addEventListener("selectionchange", onSelectionChange)
    return () => document.removeEventListener("selectionchange", onSelectionChange)
  }, [])

  useEffect(() => {
    const refreshViewport = () => setViewportVersion((version) => version + 1)

    window.addEventListener("scroll", refreshViewport, { passive: true })
    window.addEventListener("resize", refreshViewport)
    return () => {
      window.removeEventListener("scroll", refreshViewport)
      window.removeEventListener("resize", refreshViewport)
    }
  }, [])

  const persistPanels = useCallback(async (nextPanels: PanelState[]) => {
    const sourceNodes: CotsNode[] = nextPanels.map((panel) => ({
      id: panel.sourceId,
      kind: "selection",
      label: panel.selection.text.slice(0, 80),
      anchor: panel.selection
    }))

    const panelNodes: CotsNode[] = nextPanels.map((panel) => ({
      id: panel.id,
      kind: "ai-panel",
      label: panel.title,
      anchor: panel.selection,
      panel: {
        sourceId: panel.sourceId,
        x: panel.x,
        y: panel.y,
        width: panel.width,
        height: panel.height,
        minimized: panel.minimized,
        maximized: panel.maximized
      }
    }))

    const edges: CotsEdge[] = nextPanels.map((panel) => ({
      id: `edge_${panel.sourceId}_${panel.id}`,
      sourceId: panel.sourceId,
      targetId: panel.id,
      label: "context"
    }))

    const graph: CotsGraph = {
      nodes: [...sourceNodes, ...panelNodes],
      edges,
      updatedAt: new Date().toISOString()
    }

    await saveGraph(graph)
  }, [])

  const updatePanels = useCallback(
    (updater: (current: PanelState[]) => PanelState[]) => {
      setPanels((current) => {
        const next = updater(current)
        persistPanels(next)
        return next
      })
    },
    [persistPanels]
  )

  const createPanel = useCallback(async () => {
    if (!draft) {
      return
    }

    const sourceId = createId("source")
    const settings = await loadSettings()
    const panel: PanelState = {
      id: createId("panel"),
      sourceId,
      title: draft.text.length > 48 ? `${draft.text.slice(0, 48)}...` : draft.text,
      selection: draft,
      x: clamp(draft.buttonX + 24, window.scrollX + 16, window.scrollX + window.innerWidth - settings.panelWidth - 16),
      y: clamp(draft.buttonY + 24, window.scrollY + 16, window.scrollY + window.innerHeight - settings.panelHeight - 16),
      width: settings.panelWidth,
      height: settings.panelHeight,
      minimized: false,
      maximized: false,
      loading: true,
      response: "",
      conversationHistory: [],
      settings
    }

    updatePanels((current) => [...current, panel])
    setDraft(null)
    window.getSelection()?.removeAllRanges()

    chrome.runtime.sendMessage(
      {
        type: "COTS_AI_REQUEST",
        payload: {
          selection: draft,
          conversationHistory: []
        }
      },
      (reply: { ok: boolean; result?: AiResponse; error?: string }) => {
        updatePanels((current) =>
          current.map((item) =>
            item.id === panel.id
              ? {
                ...item,
                loading: false,
                response: reply?.ok
                  ? reply.result?.text ?? "No AI response returned."
                  : reply?.error ?? "AI request failed."
              }
              : item
          )
        )
      }
    )
  }, [draft, updatePanels])

  useEffect(() => {
    if (!dragState) {
      return
    }

    const onPointerMove = (event: PointerEvent) => {
      updatePanels((current) =>
        current.map((panel) => {
          if (panel.id !== dragState.id) {
            return panel
          }

          if (dragState.type === "move") {
            return {
              ...panel,
              x: dragState.panelX + event.clientX - dragState.startX + window.scrollX,
              y: dragState.panelY + event.clientY - dragState.startY + window.scrollY
            }
          }

          return {
            ...panel,
            width: clamp(dragState.width + event.clientX - dragState.startX, 280, 680),
            height: clamp(dragState.height + event.clientY - dragState.startY, 180, 640)
          }
        })
      )
    }

    const onPointerUp = () => setDragState(null)

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }
  }, [dragState, updatePanels])

  const edges = useMemo(
    () =>
      panels.map((panel) => {
        const rect = panel.selection.rect
        return {
          id: panel.id,
          x1: rect.right,
          y1: rect.top + rect.height / 2,
          x2: panel.x,
          y2: panel.y + 28
        }
      }),
    [panels, viewportVersion]
  )

  return (
    <div className="fixed inset-0 z-[2147483647] pointer-events-none text-text">
      <svg className="absolute left-0 top-0 h-[100vh] w-[100vw] overflow-visible">
        {edges.map((edge) => (
          <line
            key={edge.id}
            x1={edge.x1 - window.scrollX}
            y1={edge.y1 - window.scrollY}
            x2={edge.x2 - window.scrollX}
            y2={edge.y2 - window.scrollY}
            stroke="#1e3a5f"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.5"
          />
        ))}
      </svg>

      {draft && (
        <button
          className="pointer-events-auto absolute flex items-center gap-1.5 rounded-lg border border-accent/50 bg-paper px-4 py-2.5 text-xs font-semibold text-accent transition-all duration-200 hover:bg-accent/10 active:scale-95 animate-fade-in"
          style={{
            left: draft.buttonX - window.scrollX,
            top: draft.buttonY - window.scrollY
          }}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={createPanel}>
          <Plus className="h-3.5 w-3.5" />
          COT-tab
        </button>
      )}

      {panels.map((panel) => {
        const isMaximized = panel.maximized
        const panelWidth = isMaximized ? window.innerWidth - 32 : panel.width
        const panelHeight = isMaximized ? window.innerHeight - 32 : panel.height
        const panelX = isMaximized ? window.scrollX + 16 : panel.x
        const panelY = isMaximized ? window.scrollY + 16 : panel.y

        return (
          <section
            key={panel.id}
            className={`pointer-events-auto absolute overflow-hidden rounded-xl border animate-fade-in ${isMaximized
                ? "border-accent/50"
                : "border-line/30 hover:border-line/50"
              } bg-paper shadow-panel`}
            style={{
              left: panelX - window.scrollX,
              top: panelY - window.scrollY,
              width: panelWidth,
              height: panel.minimized ? 44 : panelHeight,
              transition: isMaximized ? "all 0.3s ease-out" : "box-shadow 0.2s ease"
            }}>
            <header
              className="flex h-11 cursor-move items-center gap-2 border-b border-line/20 bg-paper-light/50 px-3"
              onPointerDown={(event) => {
                if (isMaximized) return
                event.currentTarget.setPointerCapture(event.pointerId)
                setDragState({
                  type: "move",
                  id: panel.id,
                  startX: event.clientX,
                  startY: event.clientY,
                  panelX: panel.x - window.scrollX,
                  panelY: panel.y - window.scrollY
                })
              }}>
              <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                {panel.title}
              </h2>

              <div className="flex items-center gap-1">
                <button
                  className="rounded border border-line/20 bg-paper px-1.5 py-1 text-[10px] font-medium text-text-dim transition-all hover:border-accent/50 hover:text-accent"
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() =>
                    updatePanels((current) =>
                      current.map((item) =>
                        item.id === panel.id
                          ? {
                            ...item,
                            minimized: !item.minimized,
                            maximized: item.minimized ? false : item.maximized
                          }
                          : item
                      )
                    )
                  }>
                  {panel.minimized ? "▾" : "▴"}
                </button>

                <button
                  className={`rounded border px-1.5 py-1 text-[10px] font-medium transition-all ${isMaximized
                      ? "border-accent/50 bg-accent/10 text-accent"
                      : "border-line/20 bg-paper text-text-dim hover:border-accent/50 hover:text-accent"
                    }`}
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() =>
                    updatePanels((current) =>
                      current.map((item) =>
                        item.id === panel.id
                          ? { ...item, maximized: !item.maximized }
                          : item
                      )
                    )
                  }
                  title={isMaximized ? "Restore" : "Maximize"}>
                  {isMaximized ? (
                    <Minimize2 className="h-3 w-3" />
                  ) : (
                    <Maximize2 className="h-3 w-3" />
                  )}
                </button>

                <button
                  className="rounded border border-line/20 bg-paper px-1.5 py-1 text-[10px] font-medium text-text-dim transition-all hover:border-signal/50 hover:text-signal"
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() =>
                    updatePanels((current) => current.filter((item) => item.id !== panel.id))
                  }
                  title="Close">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </header>

            {!panel.minimized && (
              <div className="flex flex-col" style={{ height: "calc(100% - 44px)" }}>
                <div className="flex-1 overflow-auto scrollbar-thin p-4">
                  <div className="mb-3 rounded-lg border-l-2 border-accent bg-paper-light/30 p-3">
                    <p className="text-xs leading-5 text-text-dim">{panel.selection.text}</p>
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-6 text-text">
                    {panel.loading ? (
                      <div className="flex items-center gap-2 text-text-dim">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                        Initializing AI context panel...
                      </div>
                    ) : (
                      panel.response
                    )}
                  </div>

                  {/* Follow-up conversation history */}
                  {panel.conversationHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`mt-3 rounded-lg p-3 text-xs ${msg.role === "user"
                          ? "ml-4 border-l-2 border-accent bg-paper-light/20"
                          : "mr-4 border-l-2 border-success bg-paper-light/20"
                        }`}>
                      <div className="mb-1 font-medium uppercase tracking-wider text-text-dim">
                        {msg.role === "user" ? "You" : "AI"}
                      </div>
                      <div className="leading-5 text-text-dim">{msg.content}</div>
                    </div>
                  ))}
                </div>

                {/* Follow-up input */}
                {panel.settings.enableFollowUp && (
                  <FollowUpInput
                    panel={panel}
                    updatePanels={updatePanels}
                    isMaximized={isMaximized}
                  />
                )}

                {!isMaximized && (
                  <button
                    aria-label="Resize panel"
                    className="absolute bottom-1.5 right-1.5 h-4 w-4 cursor-nwse-resize rounded-sm border-b-2 border-r-2 border-line/30 transition-colors hover:border-accent/50"
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault()
                      setDragState({
                        type: "resize",
                        id: panel.id,
                        startX: event.clientX,
                        startY: event.clientY,
                        width: panel.width,
                        height: panel.height
                      })
                    }}
                  />
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

export default CotsOverlay
