// @ts-ignore: side-effect CSS import may not have type declarations
import "./styles/globals.css"

import React from "react"
import { useEffect, useState } from "react"
import { Settings, Trash2, Sparkles, FolderKanban, Layers, FileText, Plus, X } from "lucide-react"

import { browser } from "./lib/browser"
import type { CotsGraph, CotsGroup, CotsAction, FullState } from "./lib/types"

function Popup() {
  const [graph, setGraph] = useState<CotsGraph | null>(null)
  const [groups, setGroups] = useState<CotsGroup[]>([])
  const [activeTab, setActiveTab] = useState<"graph" | "groups">("graph")
  const [creating, setCreating] = useState(false)
  const [newGroupLabel, setNewGroupLabel] = useState("")

  const refresh = () => {
    browser.runtime.sendMessage(
      { type: "COTS_ACTION", payload: { type: "FULL_STATE_REQUEST" } as CotsAction }
    ).then((reply: any) => {
      if (reply?.ok && reply.payload) {
        setGraph(reply.payload.graph)
        setGroups(reply.payload.groups)
      }
    })
  }

  useEffect(() => {
    refresh()
  }, [])

  const clearGraph = () => {
    browser.runtime.sendMessage(
      { type: "COTS_ACTION", payload: { type: "PANELS_UPDATED", payload: { nodes: [], edges: [] } } as CotsAction }
    ).then(() => {
      setGraph({ nodes: [], edges: [], updatedAt: new Date().toISOString() })
    })
  }

  const openOptions = () => {
    browser.runtime.openOptionsPage()
  }

  const createGroup = () => {
    if (!newGroupLabel.trim()) return
    const groupId = `group_${Date.now()}_${Math.random().toString(16).slice(2)}`
    const newGroup: CotsGroup = {
      id: groupId,
      label: newGroupLabel.trim(),
      nodeIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    const updated = [...groups, newGroup]
    setGroups(updated)
    browser.runtime.sendMessage({
      type: "COTS_ACTION",
      payload: { type: "GROUPS_UPDATED", payload: updated } as CotsAction
    })
    setNewGroupLabel("")
    setCreating(false)
  }

  const deleteGroup = (groupId: string) => {
    browser.runtime.sendMessage({
      type: "COTS_ACTION",
      payload: { type: "GROUP_DELETED", payload: groupId } as CotsAction
    })
    setGroups((prev) => prev.filter((g) => g.id !== groupId))
  }

  const summarizeGroup = (groupId: string) => {
    browser.runtime.sendMessage({
      type: "COTS_ACTION",
      payload: { type: "SUMMARIZE_GROUP", payload: { groupId } } as CotsAction
    })
  }

  return (
    <main className="w-80 bg-paper text-text animate-fade-in">
      <div className="border-b border-line/20 p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h1 className="text-base font-semibold text-text">
              Context On Tabs
            </h1>
          </div>
          <button
            onClick={openOptions}
            className="rounded-lg border border-line/20 bg-paper/50 p-1.5 text-text-dim transition-all hover:border-accent/50 hover:text-accent"
            title="Settings">
            <Settings className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-text-dim leading-relaxed">
          Highlight text to create AI context panels
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line/20">
        <button
          className={`flex-1 px-3 py-2 text-xs font-medium transition-all ${
            activeTab === "graph"
              ? "border-b-2 border-accent text-accent"
              : "text-text-dim hover:text-text"
          }`}
          onClick={() => setActiveTab("graph")}>
          Graph
        </button>
        <button
          className={`flex-1 px-3 py-2 text-xs font-medium transition-all ${
            activeTab === "groups"
              ? "border-b-2 border-accent text-accent"
              : "text-text-dim hover:text-text"
          }`}
          onClick={() => setActiveTab("groups")}>
          Groups ({groups.length})
        </button>
      </div>

      {/* Graph tab */}
      {activeTab === "graph" && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-line/20 p-3 animate-slide-in">
              <dt className="text-[10px] font-medium uppercase tracking-wider text-text-dim">
                Nodes
              </dt>
              <dd className="mt-1 text-xl font-semibold text-accent">
                {graph?.nodes.length ?? 0}
              </dd>
            </div>
            <div className="rounded-lg border border-line/20 p-3 animate-slide-in [animation-delay:100ms]">
              <dt className="text-[10px] font-medium uppercase tracking-wider text-text-dim">
                Edges
              </dt>
              <dd className="mt-1 text-xl font-semibold text-success">
                {graph?.edges.length ?? 0}
              </dd>
            </div>
          </div>

          <div className="rounded-lg border border-line/20 p-3 animate-slide-in [animation-delay:200ms]">
            <dt className="text-[10px] font-medium uppercase tracking-wider text-text-dim">
              Groups
            </dt>
            <dd className="mt-1 text-lg font-semibold text-text">
              {groups.length}
            </dd>
          </div>

          <button
            className="w-full rounded-lg border border-signal/30 bg-signal/5 px-3 py-2.5 text-sm font-medium text-signal transition-all duration-200 hover:bg-signal/10 active:scale-[0.98]"
            type="button"
            onClick={clearGraph}>
            <span className="flex items-center justify-center gap-2">
              <Trash2 className="h-4 w-4" />
              Clear Graph
            </span>
          </button>
        </div>
      )}

      {/* Groups tab */}
      {activeTab === "groups" && (
        <div className="p-4 space-y-3">
          {groups.length === 0 && !creating && (
            <div className="rounded-lg border border-line/20 p-4 text-center">
              <FolderKanban className="mx-auto mb-2 h-8 w-8 text-text-dim" />
              <p className="text-xs text-text-dim">
                No groups yet. Create one from the overlay or here.
              </p>
            </div>
          )}

          {groups.map((group) => (
            <div
              key={group.id}
              className="rounded-lg border border-line/20 p-3 animate-slide-in">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-text">{group.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="rounded border border-line/20 px-1.5 py-1 text-[10px] text-text-dim hover:text-accent hover:border-accent/50"
                    type="button"
                    onClick={() => summarizeGroup(group.id)}
                    title="Generate correlation summary">
                    <FileText className="h-3 w-3" />
                  </button>
                  <button
                    className="rounded border border-line/20 px-1.5 py-1 text-[10px] text-text-dim hover:text-signal hover:border-signal/50"
                    type="button"
                    onClick={() => deleteGroup(group.id)}
                    title="Delete group">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-text-dim">
                <span>{group.nodeIds.length} node{group.nodeIds.length !== 1 ? "s" : ""}</span>
                {group.summary && (
                  <>
                    <span>•</span>
                    <span className="truncate flex-1">{group.summary.slice(0, 60)}...</span>
                  </>
                )}
                {!group.summary && group.nodeIds.length >= 2 && (
                  <button
                    className="text-accent hover:underline"
                    type="button"
                    onClick={() => summarizeGroup(group.id)}>
                    Generate summary
                  </button>
                )}
              </div>
            </div>
          ))}

          {creating ? (
            <div className="flex items-center gap-2 rounded-lg border border-line/20 p-3">
              <input
                type="text"
                value={newGroupLabel}
                onChange={(e) => setNewGroupLabel(e.target.value)}
                placeholder="Group name..."
                className="flex-1 rounded border border-line/20 bg-paper/50 px-2 py-1.5 text-xs text-text placeholder-text-dim focus:border-accent/50 focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") createGroup()
                  if (e.key === "Escape") setCreating(false)
                }}
              />
              <button
                className="rounded bg-accent px-2 py-1.5 text-xs font-medium text-paper hover:bg-accent/90 disabled:opacity-50"
                type="button"
                disabled={!newGroupLabel.trim()}
                onClick={createGroup}>
                Create
              </button>
              <button
                className="rounded border border-line/20 px-2 py-1.5 text-xs text-text-dim hover:text-text"
                type="button"
                onClick={() => setCreating(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="w-full rounded-lg border border-dashed border-line/30 px-3 py-2.5 text-sm font-medium text-text-dim transition-all hover:border-accent/50 hover:text-accent"
              type="button"
              onClick={() => setCreating(true)}>
              <span className="flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                New Group
              </span>
            </button>
          )}
        </div>
      )}

      <div className="border-t border-line/20 p-3">
        <p className="text-center text-[10px] uppercase tracking-wider text-text-dim">
          v1.0 • AI Context
        </p>
      </div>
    </main>
  )
}

export default Popup
