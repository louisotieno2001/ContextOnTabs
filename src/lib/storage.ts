import { browser } from "./browser"
import type { CotsGraph, CotsGroup, Settings } from "./types"
import { DEFAULT_SETTINGS } from "./types"

const GRAPH_KEY = "cots.graph"
const GROUPS_KEY = "cots.groups"
const SETTINGS_KEY = "cots.settings"

const emptyGraph = (): CotsGraph => ({
  nodes: [],
  edges: [],
  updatedAt: new Date().toISOString()
})

const hasStorage = () =>
  typeof browser !== "undefined" && Boolean(browser.storage?.local)

export async function loadGraph(): Promise<CotsGraph> {
  if (!hasStorage()) {
    return emptyGraph()
  }

  const result = await browser.storage.local.get(GRAPH_KEY)
  return (result[GRAPH_KEY] as CotsGraph | undefined) ?? emptyGraph()
}

export async function saveGraph(graph: CotsGraph): Promise<void> {
  if (!hasStorage()) {
    return
  }

  await browser.storage.local.set({
    [GRAPH_KEY]: {
      ...graph,
      updatedAt: new Date().toISOString()
    }
  })
}

export async function clearGraph(): Promise<void> {
  if (!hasStorage()) {
    return
  }

  await browser.storage.local.remove(GRAPH_KEY)
}

// --- Groups ---

export async function loadGroups(): Promise<CotsGroup[]> {
  if (!hasStorage()) {
    return []
  }

  const result = await browser.storage.local.get(GROUPS_KEY)
  return (result[GROUPS_KEY] as CotsGroup[] | undefined) ?? []
}

export async function saveGroups(groups: CotsGroup[]): Promise<void> {
  if (!hasStorage()) {
    return
  }

  await browser.storage.local.set({
    [GROUPS_KEY]: groups
  })
}

export async function clearGroups(): Promise<void> {
  if (!hasStorage()) {
    return
  }

  await browser.storage.local.remove(GROUPS_KEY)
}

export async function loadFullState(): Promise<{ graph: CotsGraph; groups: CotsGroup[] }> {
  const [graph, groups] = await Promise.all([loadGraph(), loadGroups()])
  return { graph, groups }
}

// --- Settings ---

export async function loadSettings(): Promise<Settings> {
  if (!hasStorage()) {
    return { ...DEFAULT_SETTINGS }
  }

  const result = await browser.storage.local.get(SETTINGS_KEY)
  return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] as Partial<Settings> | undefined) }
}

export async function saveSettings(settings: Partial<Settings>): Promise<Settings> {
  if (!hasStorage()) {
    return { ...DEFAULT_SETTINGS, ...settings }
  }

  const current = await loadSettings()
  const updated = { ...current, ...settings }
  await browser.storage.local.set({ [SETTINGS_KEY]: updated })
  return updated
}
