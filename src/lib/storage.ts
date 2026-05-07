import type { CotsGraph, Settings } from "./types"
import { DEFAULT_SETTINGS } from "./types"

const GRAPH_KEY = "cots.graph"
const SETTINGS_KEY = "cots.settings"

const emptyGraph = (): CotsGraph => ({
  nodes: [],
  edges: [],
  updatedAt: new Date().toISOString()
})

const hasChromeStorage = () =>
  typeof chrome !== "undefined" && Boolean(chrome.storage?.local)

export async function loadGraph(): Promise<CotsGraph> {
  if (!hasChromeStorage()) {
    return emptyGraph()
  }

  const result = await chrome.storage.local.get(GRAPH_KEY)
  return (result[GRAPH_KEY] as CotsGraph | undefined) ?? emptyGraph()
}

export async function saveGraph(graph: CotsGraph): Promise<void> {
  if (!hasChromeStorage()) {
    return
  }

  await chrome.storage.local.set({
    [GRAPH_KEY]: {
      ...graph,
      updatedAt: new Date().toISOString()
    }
  })
}

export async function clearGraph(): Promise<void> {
  if (!hasChromeStorage()) {
    return
  }

  await chrome.storage.local.remove(GRAPH_KEY)
}

export async function loadSettings(): Promise<Settings> {
  if (!hasChromeStorage()) {
    return { ...DEFAULT_SETTINGS }
  }

  const result = await chrome.storage.local.get(SETTINGS_KEY)
  return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] as Partial<Settings> | undefined) }
}

export async function saveSettings(settings: Partial<Settings>): Promise<Settings> {
  if (!hasChromeStorage()) {
    return { ...DEFAULT_SETTINGS, ...settings }
  }

  const current = await loadSettings()
  const updated = { ...current, ...settings }
  await chrome.storage.local.set({ [SETTINGS_KEY]: updated })
  return updated
}
