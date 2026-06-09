import { browser } from "./lib/browser"
import { answerContext } from "./lib/ai"
import { loadSettings, saveGraph, loadGraph, loadGroups, saveGroups } from "./lib/storage"
import type { AiRequest, CotsAction, CotsBroadcast, CotsGraph, CotsGroup } from "./lib/types"

const activeTabs = new Set<number>()

browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.set({
    "cots.install": {
      installedAt: new Date().toISOString(),
      version: browser.runtime.getManifest().version
    }
  })
})

function broadcastToTabs(message: CotsBroadcast) {
  for (const tabId of activeTabs) {
    browser.tabs.sendMessage(tabId, message).catch(() => {
      activeTabs.delete(tabId)
    })
  }
}

browser.tabs.onRemoved.addListener((tabId: number) => {
  activeTabs.delete(tabId)
})

async function summarizeGroup(groupId: string, group: CotsGroup, graph: CotsGraph) {
  const groupNodes = graph.nodes.filter((n) => group.nodeIds.includes(n.id))
  const texts = groupNodes
    .map((n) => n.anchor?.text ?? n.label)
    .filter(Boolean)

  if (texts.length === 0) {
    return
  }

  const settings = await loadSettings()
  const contextText = texts.map((t, i) => `[${i + 1}] ${t}`).join("\n\n---\n\n")
  const summaryPrompt = `Synthesize the following research excerpts into a coherent summary. Identify common themes, contradictions, and connections between them:\n\n${contextText}`

  const request: AiRequest = {
    selection: {
      text: contextText,
      pageTitle: "Group Summary",
      pageUrl: "",
      rect: { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 },
      createdAt: new Date().toISOString()
    },
    prompt: summaryPrompt
  }

  try {
    const response = await answerContext(request, settings)
    group.summary = response.text
    const groups = await loadGroups()
    const updated = groups.map((g) => (g.id === groupId ? { ...g, summary: response.text, updatedAt: new Date().toISOString() } : g))
    await saveGroups(updated)
    broadcastToTabs({ type: "GROUP_SUMMARY", payload: { groupId, summary: response.text } })
  } catch {
    // silent failure — summary will be missing but state is intact
  }
}

async function handleAction(action: CotsAction) {
  switch (action.type) {
    case "FULL_STATE_REQUEST": {
      const graph = await loadGraph()
      const groups = await loadGroups()
      return { graph, groups }
    }

    case "PANELS_UPDATED": {
      const incoming = action.payload as { nodes: CotsGraph["nodes"]; edges: CotsGraph["edges"] }
      const version = new Date().toISOString()
      const graph: CotsGraph = { ...incoming, updatedAt: version }
      await saveGraph(graph)
      broadcastToTabs({ type: "GRAPH_UPDATED", payload: graph })
      return
    }

    case "PANEL_DELETED": {
      const panelId = action.payload as string
      const current = await loadGraph()
      const graph: CotsGraph = {
        nodes: current.nodes.filter((n) => n.id !== panelId),
        edges: current.edges.filter((e) => e.targetId !== panelId && e.sourceId !== panelId),
        updatedAt: new Date().toISOString()
      }
      await saveGraph(graph)
      broadcastToTabs({ type: "GRAPH_UPDATED", payload: graph })
      return
    }

    case "GROUPS_UPDATED": {
      const groups = action.payload as CotsGroup[]
      await saveGroups(groups)

      const graph = await loadGraph()
      broadcastToTabs({ type: "GROUPS_UPDATED", payload: groups })
      return
    }

    case "GROUP_DELETED": {
      const groupId = action.payload as string
      let groups = await loadGroups()
      groups = groups.filter((g) => g.id !== groupId)
      await saveGroups(groups)

      const graph = await loadGraph()
      graph.nodes = graph.nodes.map((n) =>
        n.groupId === groupId ? { ...n, groupId: undefined, panel: n.panel ? { ...n.panel, groupId: undefined } : undefined } : n
      )
      await saveGraph(graph)
      broadcastToTabs({ type: "FULL_STATE_SYNC", payload: { graph, groups } })
      return
    }

    case "SUMMARIZE_GROUP": {
      const { groupId } = action.payload as { groupId: string }
      const graph = await loadGraph()
      const groups = await loadGroups()
      const group = groups.find((g) => g.id === groupId)
      if (!group) return
      summarizeGroup(groupId, group, graph)
      return
    }

    case "SYNC_REQUEST": {
      const graph = await loadGraph()
      const groups = await loadGroups()
      broadcastToTabs({ type: "FULL_STATE_SYNC", payload: { graph, groups } })
      return
    }
  }
}

browser.runtime.onMessage.addListener(async (message: any, sender) => {
  if (sender.tab?.id) {
    activeTabs.add(sender.tab.id)
  }

  if (message?.type === "COTS_AI_REQUEST") {
    try {
      const settings = await loadSettings()
      const result = await answerContext(message.payload as AiRequest, settings)
      return { ok: true, result }
    } catch (error: any) {
      return { ok: false, error: error.message }
    }
  }

  if (message?.type === "COTS_ACTION") {
    try {
      const result = await handleAction(message.payload as CotsAction)
      return { ok: true, payload: result ?? undefined }
    } catch (error: any) {
      return { ok: false, error: error.message }
    }
  }

  return undefined
})
