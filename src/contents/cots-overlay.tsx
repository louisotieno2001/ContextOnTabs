import type { PlasmoCSConfig } from "plasmo"
import iconUrl from "url:~/assets/icon.png"
import React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight, Maximize2, Minimize2, Plus, X, FolderKanban, Layers, FileText } from "lucide-react"

import cssText from "data-text:~styles/globals.css"

import { browser } from "../lib/browser"
import { createId } from "../lib/id"
import { loadSettings } from "../lib/storage"
import type {
  AiResponse, CotsEdge, CotsGraph, CotsNode, CotsNodePanel,
  SelectionAnchor, Settings, CotsGroup, CotsAction, CotsBroadcast,
  CotsNodeKind, FullState
} from "../lib/types"
import { DEFAULT_SETTINGS } from "../lib/types"

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#fef08a" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Orange", value: "#fed7aa" }
]

function highlightSelection(color: string, onShowTooltip: (draft: DraftSelection) => void) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  const text = selection.toString().trim()
  if (!text) return

  const span = document.createElement("span")
  span.style.backgroundColor = color
  span.style.color = "black"
  span.style.cursor = "pointer"
  span.className = "cots-highlight"
  span.dataset.text = text

  // Add click handler to show options for existing highlight
  span.onclick = (e) => {
    e.stopPropagation()
    const rect = span.getBoundingClientRect()
    onShowTooltip({
      text: span.dataset.text || span.innerText,
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
      buttonY: clamp(rect.top + window.scrollY - 4, window.scrollY + 12, window.scrollY + window.innerHeight - 44),
      isExistingHighlight: true,
      highlightElement: span
    } as any)
  }

  try {
    const fragment = range.extractContents()
    span.appendChild(fragment)
    range.insertNode(span)
  } catch (e) {
    console.error("Highlight failed:", e)
  }
  selection.removeAllRanges()
}

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
  isExistingHighlight?: boolean
  highlightElement?: HTMLSpanElement
}

function removeHighlight(element: HTMLSpanElement) {
  const parent = element.parentNode
  if (!parent) return
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element)
  }
  parent.removeChild(element)
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
  groupId?: string
  kind: CotsNodeKind
}

function sendAction(action: CotsAction) {
  browser.runtime.sendMessage({
    type: "COTS_ACTION",
    payload: action
  })
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

      browser.runtime.sendMessage({
        type: "COTS_AI_REQUEST",
        payload: {
          selection: panel.selection,
          prompt: userMessage,
          conversationHistory: [
            ...panel.conversationHistory,
            { role: "user" as const, content: userMessage }
          ]
        }
      }).then((reply: any) => {
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
      })
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
    settings,
    groupId: node.panel.groupId,
    kind: node.kind
  }
}

function GroupSelector({
  panel,
  groups,
  onAssignGroup,
  onCreateGroup
}: {
  panel: PanelState
  groups: CotsGroup[]
  onAssignGroup: (panelId: string, groupId: string | undefined) => void
  onCreateGroup: (panelId: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        className={`rounded border px-1.5 py-1 text-[10px] font-medium transition-all ${
          panel.groupId
            ? "border-accent/50 bg-accent/10 text-accent"
            : "border-line/20 bg-paper text-text-dim hover:border-accent/50 hover:text-accent"
        }`}
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setOpen(!open)}
        title="Manage groups">
        <FolderKanban className="h-3 w-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-48 rounded-lg border border-line/20 bg-paper shadow-lg">
            <div className="border-b border-line/20 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-text-dim">
              Groups
            </div>

            {panel.groupId && (
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-dim hover:bg-paper-light/50 hover:text-signal"
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  onAssignGroup(panel.id, undefined)
                  setOpen(false)
                }}>
                <X className="h-3 w-3" />
                Remove from group
              </button>
            )}

            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-accent hover:bg-paper-light/50"
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                onCreateGroup(panel.id)
                setOpen(false)
              }}>
              <Plus className="h-3 w-3" />
              Create new group
            </button>

            {groups.filter((g) => !panel.groupId || g.id !== panel.groupId).map((g) => (
              <button
                key={g.id}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text hover:bg-paper-light/50"
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  onAssignGroup(panel.id, g.id)
                  setOpen(false)
                }}>
                <Layers className="h-3 w-3 text-accent/70" />
                {g.label}
                {g.summary && <FileText className="ml-auto h-3 w-3 text-text-dim" />}
              </button>
            ))}

            {groups.length === 0 && panel.groupId === undefined && (
              <div className="px-3 py-2 text-[10px] text-text-dim">No groups yet</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function CreateGroupDialog({
  preselectedPanelId,
  panels,
  groups,
  onConfirm
}: {
  preselectedPanelId?: string
  panels: PanelState[]
  groups: CotsGroup[]
  onConfirm: (label: string, panelIds: string[]) => void
}) {
  const [label, setLabel] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    preselectedPanelId ? [preselectedPanelId] : []
  )

  const togglePanel = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 pointer-events-auto">
      <div
        className="w-96 rounded-xl border border-line/30 bg-paper p-5 shadow-panel"
        onPointerDown={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-sm font-semibold text-text">Create Group</h3>

        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Group name..."
          className="mb-3 w-full rounded-lg border border-line/20 bg-paper/50 px-3 py-2 text-xs text-text placeholder-text-dim focus:border-accent/50 focus:outline-none"
          autoFocus
        />

        <div className="mb-3 max-h-40 overflow-auto space-y-1">
          {panels.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-text hover:bg-paper-light/30 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.includes(p.id)}
                onChange={() => togglePanel(p.id)}
                className="rounded border-line/30"
              />
              <span className="truncate flex-1">{p.title}</span>
              {p.groupId && (
                <span className="text-[9px] text-text-dim uppercase">
                  {groups.find((g) => g.id === p.groupId)?.label ?? "grouped"}
                </span>
              )}
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="rounded-lg border border-line/20 px-3 py-1.5 text-xs text-text-dim hover:bg-paper-light/50"
            type="button"
            onClick={() => onConfirm("", [])}>
            Cancel
          </button>
          <button
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-paper hover:bg-accent/90 disabled:opacity-50"
            type="button"
            disabled={!label.trim() || selectedIds.length === 0}
            onClick={() => onConfirm(label.trim(), selectedIds)}>
            Create Group
          </button>
        </div>
      </div>
    </div>
  )
}

function CotsOverlay() {
  const [draft, setDraft] = useState<DraftSelection | null>(null)
  const [panels, setPanels] = useState<PanelState[]>([])
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [viewportVersion, setViewportVersion] = useState(0)
  const [globalSettings, setGlobalSettings] = useState<Settings>({ ...DEFAULT_SETTINGS })
  const [groups, setGroups] = useState<CotsGroup[]>([])
  const [showCreateGroup, setShowCreateGroup] = useState<string | null>(null)
  const [showGroupSummary, setShowGroupSummary] = useState<string | null>(null)

  const panelsRef = useRef(panels)
  panelsRef.current = panels
  const groupsRef = useRef(groups)
  groupsRef.current = groups

  // Load initial state from background
  useEffect(() => {
    loadSettings().then((s) => {
      setGlobalSettings(s)

      browser.runtime.sendMessage(
        { type: "COTS_ACTION", payload: { type: "FULL_STATE_REQUEST" } }
      ).then((reply: any) => {
        if (reply?.ok && reply.payload) {
          const { graph, groups: loadedGroups } = reply.payload as FullState
          setGroups(loadedGroups)

          const restored = graph.nodes
            .filter((node) => node.kind === "ai-panel" || node.kind === "group-summary")
            .map((node) => panelFromNode(node, s))
            .filter(Boolean) as PanelState[]

          setPanels(restored)
        }
      })
    })
  }, [])

  // Listen for broadcasts from background
  useEffect(() => {
    const handler = (message: CotsBroadcast) => {
      if (message.type === "GRAPH_UPDATED") {
        const graph = message.payload as CotsGraph
        loadSettings().then((s) => {
          const restored = graph.nodes
            .filter((node) => node.kind === "ai-panel" || node.kind === "group-summary")
            .map((node) => panelFromNode(node, s))
            .filter(Boolean) as PanelState[]
          setPanels((prev) => {
            const merged = new Map<string, PanelState>()
            for (const p of prev) merged.set(p.id, p)
            for (const p of restored) {
              if (!merged.has(p.id)) merged.set(p.id, p)
              else {
                const existing = merged.get(p.id)!
                merged.set(p.id, { ...p, conversationHistory: existing.conversationHistory, loading: existing.loading, response: existing.response })
              }
            }
            return Array.from(merged.values())
          })
        })
        return
      }

      if (message.type === "GROUPS_UPDATED") {
        setGroups(message.payload as CotsGroup[])
        return
      }

      if (message.type === "FULL_STATE_SYNC") {
        const { graph, groups: syncedGroups } = message.payload as FullState
        setGroups(syncedGroups)
        loadSettings().then((s) => {
          const restored = graph.nodes
            .filter((node) => node.kind === "ai-panel" || node.kind === "group-summary")
            .map((node) => panelFromNode(node, s))
            .filter(Boolean) as PanelState[]
          setPanels(restored)
        })
        return
      }

      if (message.type === "GROUP_SUMMARY") {
        const { groupId, summary } = message.payload as { groupId: string; summary: string }
        setGroups((prev) =>
          prev.map((g) => (g.id === groupId ? { ...g, summary } : g))
        )
        return
      }
    }

    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
  }, [])

  // Selection detection
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

  // Viewport tracking for edges
  useEffect(() => {
    const refreshViewport = () => setViewportVersion((version) => version + 1)

    window.addEventListener("scroll", refreshViewport, { passive: true })
    window.addEventListener("resize", refreshViewport)
    return () => {
      window.removeEventListener("scroll", refreshViewport)
      window.removeEventListener("resize", refreshViewport)
    }
  }, [])

  // Persist panels to background
  const persistPanels = useCallback((nextPanels: PanelState[]) => {
    const sourceNodes: CotsNode[] = []
    const seenSources = new Set<string>()

    for (const panel of nextPanels) {
      if (!seenSources.has(panel.sourceId)) {
        seenSources.add(panel.sourceId)
        sourceNodes.push({
          id: panel.sourceId,
          kind: "selection",
          label: panel.selection.text.slice(0, 80),
          anchor: panel.selection,
          tabId: undefined,
          tabUrl: window.location.href
        })
      }
    }

    const panelNodes: CotsNode[] = nextPanels.map((panel) => {
      const panelData: CotsNodePanel = {
        sourceId: panel.sourceId,
        x: panel.x,
        y: panel.y,
        width: panel.width,
        height: panel.height,
        minimized: panel.minimized,
        maximized: panel.maximized
      }
      if (panel.groupId) panelData.groupId = panel.groupId
      return {
        id: panel.id,
        kind: panel.kind,
        label: panel.title,
        anchor: panel.selection,
        panel: panelData,
        groupId: panel.groupId,
        tabId: undefined,
        tabUrl: window.location.href
      }
    })

    const edges: CotsEdge[] = nextPanels.map((panel) => ({
      id: `edge_${panel.sourceId}_${panel.id}`,
      sourceId: panel.sourceId,
      targetId: panel.id,
      label: "context"
    }))

    sendAction({
      type: "PANELS_UPDATED",
      payload: { nodes: [...sourceNodes, ...panelNodes], edges }
    })
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

  // Group handlers
  const handleAssignGroup = useCallback((panelId: string, groupId: string | undefined) => {
    updatePanels((current) =>
      current.map((p) => (p.id === panelId ? { ...p, groupId } : p))
    )
    sendAction({ type: "GROUPS_UPDATED", payload: groupsRef.current })
  }, [updatePanels])

  const handleCreateGroup = useCallback((label: string, panelIds: string[]) => {
    if (!label || panelIds.length === 0) {
      setShowCreateGroup(null)
      return
    }

    const groupId = createId("group")
    const newGroup: CotsGroup = {
      id: groupId,
      label,
      nodeIds: panelIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const updatedGroups = [...groupsRef.current, newGroup]
    setGroups(updatedGroups)

    updatePanels((current) =>
      current.map((p) =>
        panelIds.includes(p.id) ? { ...p, groupId } : p
      )
    )

    sendAction({ type: "GROUPS_UPDATED", payload: updatedGroups })
    setShowCreateGroup(null)
  }, [updatePanels])

  const handleSummarizeGroup = useCallback((groupId: string) => {
    sendAction({ type: "SUMMARIZE_GROUP", payload: { groupId } })
  }, [])

  const handleDeleteGroup = useCallback((groupId: string) => {
    sendAction({ type: "GROUP_DELETED", payload: groupId })
  }, [])

  const handleToggleGroupSummary = useCallback((groupId: string) => {
    setShowGroupSummary((prev) => (prev === groupId ? null : groupId))
  }, [])

  // Create panel
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
      settings,
      kind: "ai-panel"
    }

    updatePanels((current) => [...current, panel])
    setDraft(null)
    window.getSelection()?.removeAllRanges()

    browser.runtime.sendMessage({
      type: "COTS_AI_REQUEST",
      payload: {
        selection: draft,
        conversationHistory: []
      }
    }).then((reply: any) => {
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
    })
  }, [draft, updatePanels])

  // Drag system
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

  // Edge rendering
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

  const groupPanelsInfo = useMemo(() => {
    const info = new Map<string, { group: CotsGroup; panels: PanelState[] }>()
    for (const g of groups) {
      const p = panels.filter((p) => p.groupId === g.id)
      info.set(g.id, { group: g, panels: p })
    }
    return info
  }, [groups, panels])

  return (
    <div className="fixed inset-0 z-[2147483647] pointer-events-none text-text">
      {/* SVG Edges */}
      <svg className="absolute left-0 top-0 h-[100vh] w-[100vw] overflow-visible">
        {edges.map((edge) => {
          const panel = panels.find((p) => p.id === edge.id)
          const groupColor = panel?.groupId
            ? `hsl(${hashCode(panel.groupId) % 360}, 50%, 50%)`
            : "#1e3a5f"

          return (
            <line
              key={edge.id}
              x1={edge.x1 - window.scrollX}
              y1={edge.y1 - window.scrollY}
              x2={edge.x2 - window.scrollX}
              y2={edge.y2 - window.scrollY}
              stroke={groupColor}
              strokeWidth={panel?.groupId ? "2" : "1.5"}
              strokeDasharray={panel?.groupId ? "2 2" : "4 4"}
              opacity="0.5"
            />
          )
        })}
      </svg>

      {/* Group labels floating near sources */}
      {Array.from(groupPanelsInfo.entries()).map(([groupId, info]) => {
        if (info.panels.length < 2) return null
        const firstPanel = info.panels[0]
        const groupColor = `hsl(${hashCode(groupId) % 360}, 50%, 50%)`
        return (
          <div
            key={groupId}
            className="pointer-events-auto absolute flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium border shadow-sm"
            style={{
              left: firstPanel.x - window.scrollX,
              top: firstPanel.y - window.scrollY - 20,
              backgroundColor: `${groupColor}15`,
              borderColor: `${groupColor}40`,
              color: groupColor
            }}>
            <Layers className="h-3 w-3" />
            {info.group.label}
            <span className="opacity-60">({info.panels.length})</span>
            <button
              className="ml-1 opacity-60 hover:opacity-100"
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => handleToggleGroupSummary(groupId)}>
              <FileText className="h-3 w-3" />
            </button>
            {info.group.summary && showGroupSummary === groupId && (
              <div
                className="absolute left-0 top-6 z-30 w-72 rounded-lg border bg-paper p-3 text-xs leading-relaxed shadow-lg"
                style={{ borderColor: `${groupColor}40` }}
                onPointerDown={(e) => e.stopPropagation()}>
                <div className="mb-1 font-medium text-text">Correlation Summary</div>
                <div className="text-text-dim">{info.group.summary}</div>
              </div>
            )}
          </div>
        )
      })}

      {/* COT-tab tooltip */}
      {draft && (
        <div
          className="pointer-events-auto absolute flex flex-col gap-2 animate-fade-in"
          style={{
            left: draft.buttonX - window.scrollX,
            top: draft.buttonY - window.scrollY
          }}>
          <div className="flex flex-col gap-1 rounded-lg border border-accent/50 bg-paper p-1 shadow-panel">
            <div className="flex items-center gap-1">
              <button
                className="flex items-center gap-1.5 rounded-md bg-paper px-3 py-1.5 text-xs font-semibold text-accent transition-all duration-200 hover:bg-accent/10 active:scale-95"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={createPanel}>
                <img src={iconUrl} className="h-4 w-4" alt="" />
                Open in COT-tab
              </button>
              {draft.isExistingHighlight && draft.highlightElement && (
                <>
                  <div className="h-4 w-[1px] bg-line/20 mx-1" />
                  <button
                    className="flex items-center gap-1.5 rounded-md bg-signal/10 px-3 py-1.5 text-xs font-semibold text-signal transition-all duration-200 hover:bg-signal/20 active:scale-95"
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (draft.highlightElement) {
                        removeHighlight(draft.highlightElement)
                      }
                      setDraft(null)
                    }}>
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </>
              )}
            </div>
            
            {!draft.isExistingHighlight && (
              <>
                <div className="h-[1px] w-full bg-line/10 my-0.5" />
                <div className="flex gap-1 px-1 pb-1">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.name}
                      className="h-5 w-5 rounded-full border border-line/20 transition-transform hover:scale-110 active:scale-90"
                      style={{ backgroundColor: c.value }}
                      title={`Highlight ${c.name}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        highlightSelection(c.value, setDraft)
                        setDraft(null)
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Panels */}
      {panels.map((panel) => {
        const isMaximized = panel.maximized
        const panelWidth = isMaximized ? window.innerWidth - 32 : panel.width
        const panelHeight = isMaximized ? window.innerHeight - 32 : panel.height
        const panelX = isMaximized ? window.scrollX + 16 : panel.x
        const panelY = isMaximized ? window.scrollY + 16 : panel.y
        const groupColor = panel.groupId
          ? `hsl(${hashCode(panel.groupId) % 360}, 50%, 50%)`
          : undefined

        return (
          <section
            key={panel.id}
            className={`pointer-events-auto absolute overflow-hidden rounded-xl border animate-fade-in ${
              isMaximized
                ? "border-accent/50"
                : groupColor
                  ? "border-line/30 hover:border-line/50"
                  : "border-line/30 hover:border-line/50"
            } bg-paper shadow-panel`}
            style={{
              left: panelX - window.scrollX,
              top: panelY - window.scrollY,
              width: panelWidth,
              height: panel.minimized ? 44 : panelHeight,
              transition: isMaximized ? "all 0.3s ease-out" : "box-shadow 0.2s ease",
              borderColor: groupColor && !isMaximized ? `${groupColor}40` : undefined
            }}>
            <header
              className="flex h-11 cursor-move items-center gap-2 border-b border-line/20 bg-paper-light/50 px-3"
              style={groupColor ? { borderBottomColor: `${groupColor}20` } : undefined}
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
              {panel.groupId && (
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: groupColor }}
                />
              )}
              <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                {panel.title}
              </h2>

              <div className="flex items-center gap-1">
                <GroupSelector
                  panel={panel}
                  groups={groups}
                  onAssignGroup={handleAssignGroup}
                  onCreateGroup={(panelId) => setShowCreateGroup(panelId)}
                />

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
                  onClick={() => {
                    const id = panel.id
                    updatePanels((current) => current.filter((item) => item.id !== id))
                    sendAction({ type: "PANEL_DELETED", payload: id })
                  }}
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

      {/* Group creation dialog */}
      {showCreateGroup !== null && (
        <CreateGroupDialog
          preselectedPanelId={showCreateGroup}
          panels={panels}
          groups={groups}
          onConfirm={(label, panelIds) => {
            if (label && panelIds.length > 0) {
              handleCreateGroup(label, panelIds)
            } else {
              setShowCreateGroup(null)
            }
          }}
        />
      )}
    </div>
  )
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export default CotsOverlay
