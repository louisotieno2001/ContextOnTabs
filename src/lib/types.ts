export type CotsNodeKind = "selection" | "ai-panel" | "group-summary" | "highlight"

export type SelectionRect = {
  x: number
  y: number
  width: number
  height: number
  top: number
  right: number
  bottom: number
  left: number
}

export type SelectionAnchor = {
  text: string
  pageTitle: string
  pageUrl: string
  rect: SelectionRect
  createdAt: string
}

export type CotsNodePanel = {
  sourceId: string
  x: number
  y: number
  width: number
  height: number
  minimized: boolean
  maximized: boolean
  groupId?: string
}

export type CotsNode = {
  id: string
  kind: CotsNodeKind
  label: string
  anchor?: SelectionAnchor
  panel?: CotsNodePanel
  groupId?: string
  highlightColor?: string // Added for persistence
  tabId?: number
  tabUrl?: string
}

export type CotsEdge = {
  id: string
  sourceId: string
  targetId: string
  label: string
}

export type CotsGraph = {
  nodes: CotsNode[]
  edges: CotsEdge[]
  updatedAt: string
}

// --- Groups ---

export type CotsGroup = {
  id: string
  label: string
  nodeIds: string[]
  summary?: string
  createdAt: string
  updatedAt: string
}

// --- Cross-tab messages ---

export type CotsActionType =
  | "PANELS_UPDATED"
  | "PANEL_DELETED"
  | "GROUPS_UPDATED"
  | "GROUP_DELETED"
  | "SUMMARIZE_GROUP"
  | "SYNC_REQUEST"
  | "FULL_STATE_REQUEST"

export type CotsAction = {
  type: CotsActionType
  payload?: unknown
  sourceTabId?: number
}

export type CotsBroadcastType =
  | "FULL_STATE_SYNC"
  | "GRAPH_UPDATED"
  | "GROUPS_UPDATED"
  | "GROUP_SUMMARY"

export type CotsBroadcast = {
  type: CotsBroadcastType
  payload?: unknown
}

export type FullState = {
  graph: CotsGraph
  groups: CotsGroup[]
}

export type AiProvider = "openai" | "anthropic" | "google" | "custom"

export type AiRequest = {
  selection: SelectionAnchor
  prompt?: string
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
}

export type AiResponse = {
  text: string
  model: string
  conversationId?: string
}

export type Settings = {
  aiProvider: AiProvider
  openaiApiKey?: string
  openaiModel: string
  anthropicApiKey?: string
  anthropicModel: string
  googleApiKey?: string
  googleModel: string
  customEndpoint?: string
  customModel?: string
  systemPrompt: string
  maxTokens: number
  temperature: number
  enableFollowUp: boolean
  theme: "dark" | "light" | "auto"
  panelWidth: number
  panelHeight: number
}

export const DEFAULT_SETTINGS: Settings = {
  aiProvider: "openai",
  openaiModel: "gpt-4o",
  anthropicModel: "claude-3-5-sonnet-20241022",
  googleModel: "gemini-1.5-pro",
  systemPrompt:
    "You are a research assistant. Explain the highlighted context concisely, surface useful research directions, and preserve source relevance. Be helpful, accurate, and concise.",
  maxTokens: 1000,
  temperature: 0.7,
  enableFollowUp: true,
  theme: "dark",
  panelWidth: 360,
  panelHeight: 300,
}
