export type CotsNodeKind = "selection" | "ai-panel"

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

export type CotsNode = {
  id: string
  kind: CotsNodeKind
  label: string
  anchor?: SelectionAnchor
  panel?: {
    sourceId: string
    x: number
    y: number
    width: number
    height: number
    minimized: boolean
    maximized: boolean
  }
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
