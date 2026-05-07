// @ts-ignore: side-effect CSS import may not have type declarations
import "../styles/globals.css"

import { useEffect, useState } from "react"
import { Settings, Trash2, Sparkles } from "lucide-react"

import { clearGraph, loadGraph } from "../lib/storage"
import type { CotsGraph } from "../lib/types"

function Popup() {
  const [graph, setGraph] = useState<CotsGraph | null>(null)

  useEffect(() => {
    loadGraph().then(setGraph)
  }, [])

  const resetGraph = async () => {
    await clearGraph()
    setGraph(await loadGraph())
  }

  const openOptions = () => {
    chrome.runtime.openOptionsPage()
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

        <button
          className="w-full rounded-lg border border-signal/30 bg-signal/5 px-3 py-2.5 text-sm font-medium text-signal transition-all duration-200 hover:bg-signal/10 active:scale-[0.98]"
          type="button"
          onClick={resetGraph}>
          <span className="flex items-center justify-center gap-2">
            <Trash2 className="h-4 w-4" />
            Clear Graph
          </span>
        </button>
      </div>

      <div className="border-t border-line/20 p-3">
        <p className="text-center text-[10px] uppercase tracking-wider text-text-dim">
          v1.0 • AI Context
        </p>
      </div>
    </main>
  )
}

export default Popup
