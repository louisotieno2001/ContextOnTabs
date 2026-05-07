// @ts-ignore: side-effect CSS import may not have type declarations
import "../styles/globals.css"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Brain, Palette, Info, Save, Zap, Check, Sparkles, Moon, Sun } from "lucide-react"

import { loadSettings, saveSettings } from "../lib/storage"
import type { AiProvider, Settings } from "../lib/types"
import { DEFAULT_SETTINGS } from "../lib/types"

function Options() {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS })
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<"ai" | "ui" | "about">("ai")

  useEffect(() => {
    loadSettings().then(setSettings)
  }, [])

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const handleSave = useCallback(async () => {
    await saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [settings])

  const testConnection = useCallback(async () => {
    const providers: Partial<Record<"openai" | "anthropic" | "google", string | undefined>> = {
      openai: settings.openaiApiKey,
      anthropic: settings.anthropicApiKey,
      google: settings.googleApiKey
    }

    if (settings.aiProvider !== "custom" && !providers[settings.aiProvider]) {
      alert("Please enter an API key for the selected provider first.")
      return
    }

    if (settings.aiProvider === "custom" && !settings.customEndpoint) {
      alert("Please enter a custom endpoint URL first.")
      return
    }

    alert("Connection test will be available in the next update!")
  }, [settings])

  const tabs = [
    { id: "ai" as const, label: "AI Provider", icon: Brain },
    { id: "ui" as const, label: "Interface", icon: Palette },
    { id: "about" as const, label: "About", icon: Info }
  ]

  const isDark = useMemo(() => settings.theme !== "light", [settings.theme])

  const t = useMemo(() => ({
    bg: isDark ? "bg-paper" : "bg-white",
    text: isDark ? "text-text" : "text-gray-900",
    dim: isDark ? "text-text-dim" : "text-gray-500",
    card: isDark ? "rounded-xl border border-line/20 bg-paper-light/30" : "rounded-xl border border-gray-300 bg-white",
    input: isDark
      ? "rounded-lg border border-line/20 bg-paper/50 px-4 py-3 text-text placeholder-text-dim focus:border-white/50 focus:outline-none"
      : "rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none",
    select: isDark
      ? "w-full rounded-lg border border-line/20 bg-paper/50 px-4 py-2.5 text-sm text-text focus:border-white/50 focus:outline-none"
      : "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none",
    label: isDark ? "text-text-dim" : "text-gray-600",
    accent: isDark ? "text-white" : "text-gray-900",
    accentBorder: isDark ? "border-white" : "border-gray-900",
    accentBg: isDark ? "bg-white text-paper hover:bg-white/90" : "bg-gray-900 text-white hover:bg-gray-800",
    accentBgLight: isDark ? "bg-white/10" : "bg-gray-100",
    line: isDark ? "border-line/20" : "border-gray-300",
    line30: isDark ? "border-line/30" : "border-gray-200",
    borderAccent: isDark ? "border-white/50" : "border-gray-900",
    accentBg5: isDark ? "bg-white/5" : "bg-gray-50",
    cardHover: isDark ? "hover:border-white/50" : "hover:border-gray-900",
  }), [isDark])

  return (
    <main className={`min-h-screen ${t.bg} ${t.text}`}>
      <div className="mx-auto max-w-4xl p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className={`h-5 w-5 ${t.accent}`} />
            <div>
              <h1 className="text-xl font-semibold">Context On Tabs</h1>
              <p className={`mt-0.5 text-xs ${t.dim}`}>AI Context Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateSetting("theme", isDark ? "light" : "dark")}
              className={`rounded-lg border p-2 transition-all ${isDark ? `${t.line} ${t.dim} hover:border-white/50 ${t.accent}` : "border-gray-300 text-gray-500 hover:border-gray-900 hover:text-gray-900"}`}
              title={`Switch to ${isDark ? "light" : "dark"} theme`}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all active:scale-95 ${t.accentBg}`}>
              {saved ? (
                <><Check className="h-4 w-4" /> Saved</>
              ) : (
                <><Save className="h-4 w-4" /> Save Settings</>
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`mb-6 flex gap-1 border-b ${t.line30}`}>
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? `${t.accentBorder} ${t.accent}`
                    : `border-transparent ${t.dim} hover:${isDark ? "text-white" : "text-gray-900"}`
                }`}>
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* AI Provider Settings */}
        {activeTab === "ai" && (
          <div className="space-y-6 animate-fade-in">
            {/* Provider Selection */}
            <div className={`${t.card} p-6`}>
              <h2 className={`mb-4 text-sm font-semibold`}>AI Provider</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { id: "openai" as AiProvider, name: "OpenAI", desc: "GPT-4o, GPT-4o mini, o1" },
                  { id: "anthropic" as AiProvider, name: "Anthropic", desc: "Claude 3.5 Sonnet, Haiku" },
                  { id: "google" as AiProvider, name: "Google AI", desc: "Gemini 1.5 Pro, Flash" },
                  { id: "custom" as AiProvider, name: "Custom API", desc: "OpenAI-compatible" }
                ].map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => updateSetting("aiProvider", provider.id)}
                    className={`rounded-lg border p-4 text-left transition-all ${
                      settings.aiProvider === provider.id
                        ? `${t.accentBorder} ${t.accentBgLight}`
                        : `${t.line} ${isDark ? "bg-paper/50" : "bg-white"} hover:${isDark ? "border-white/50" : "border-gray-900"}`
                    }`}>
                    <div className="font-medium text-sm">{provider.name}</div>
                    <div className={`mt-1 text-xs ${t.dim}`}>{provider.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* API Configuration */}
            <div className={`${t.card} p-6`}>
              <h2 className={`mb-4 text-sm font-semibold`}>API Configuration</h2>
              <div className="space-y-4">
                {settings.aiProvider === "openai" && (
                  <>
                    <div>
                      <label className={`mb-1.5 block text-xs font-medium uppercase tracking-wider ${t.label}`}>OpenAI API Key</label>
                      <input type="password" value={settings.openaiApiKey ?? ""} onChange={(e) => updateSetting("openaiApiKey", e.target.value)} placeholder="sk-..." className={`w-full space-y-4 ${t.input}`} />
                    </div>
                    <div>
                      <label className={`mb-1.5 block text-xs font-medium uppercase tracking-wider ${t.label}`}>Model</label>
                      <select value={settings.openaiModel} onChange={(e) => updateSetting("openaiModel", e.target.value)} className={t.select}>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4o-mini">GPT-4o Mini</option>
                        <option value="o1">o1</option>
                        <option value="o1-mini">o1-mini</option>
                      </select>
                    </div>
                  </>
                )}

                {settings.aiProvider === "anthropic" && (
                  <>
                    <div>
                      <label className={`mb-1.5 block text-xs font-medium uppercase tracking-wider ${t.label}`}>Anthropic API Key</label>
                      <input type="password" value={settings.anthropicApiKey ?? ""} onChange={(e) => updateSetting("anthropicApiKey", e.target.value)} placeholder="sk-ant-..." className={`w-full ${t.input}`} />
                    </div>
                    <div>
                      <label className={`mb-1.5 block text-xs font-medium uppercase tracking-wider ${t.label}`}>Model</label>
                      <select value={settings.anthropicModel} onChange={(e) => updateSetting("anthropicModel", e.target.value)} className={t.select}>
                        <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                        <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                        <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                      </select>
                    </div>
                  </>
                )}

                {settings.aiProvider === "google" && (
                  <>
                    <div>
                      <label className={`mb-1.5 block text-xs font-medium uppercase tracking-wider ${t.label}`}>Google API Key</label>
                      <input type="password" value={settings.googleApiKey ?? ""} onChange={(e) => updateSetting("googleApiKey", e.target.value)} placeholder="AIza..." className={`w-full ${t.input}`} />
                    </div>
                    <div>
                      <label className={`mb-1.5 block text-xs font-medium uppercase tracking-wider ${t.label}`}>Model</label>
                      <select value={settings.googleModel} onChange={(e) => updateSetting("googleModel", e.target.value)} className={t.select}>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                      </select>
                    </div>
                  </>
                )}

                {settings.aiProvider === "custom" && (
                  <>
                    <div>
                      <label className={`mb-1.5 block text-xs font-medium uppercase tracking-wider ${t.label}`}>Custom Endpoint URL</label>
                      <input type="text" value={settings.customEndpoint ?? ""} onChange={(e) => updateSetting("customEndpoint", e.target.value)} placeholder="https://api.example.com/v1/chat/completions" className={`w-full ${t.input}`} />
                    </div>
                    <div>
                      <label className={`mb-1.5 block text-xs font-medium uppercase tracking-wider ${t.label}`}>Model Name</label>
                      <input type="text" value={settings.customModel ?? ""} onChange={(e) => updateSetting("customModel", e.target.value)} placeholder="custom-model-name" className={`w-full ${t.input}`} />
                    </div>
                  </>
                )}

                <button
                  onClick={testConnection}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:${isDark ? "bg-white/10" : "bg-gray-100"} ${isDark ? "border-white/30 bg-white/5 text-white" : "border-gray-400 bg-gray-50 text-gray-900"}`}>
                  <Zap className="h-4 w-4" />
                  Test Connection
                </button>
              </div>
            </div>

            {/* AI Behavior */}
            <div className={`${t.card} p-6`}>
              <h2 className={`mb-4 text-sm font-semibold`}>AI Behavior</h2>
              <div className="space-y-4">
                <div>
                  <label className={`mb-1.5 block text-xs font-medium uppercase tracking-wider ${t.label}`}>System Prompt</label>
                  <textarea
                    value={settings.systemPrompt}
                    onChange={(e) => updateSetting("systemPrompt", e.target.value)}
                    rows={3}
                    className={`w-full ${t.input}`}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={`mb-1.5 block text-xs font-medium uppercase tracking-wider ${t.label}`}>Max Tokens: {settings.maxTokens}</label>
                    <input type="range" min="100" max="4000" step="100" value={settings.maxTokens} onChange={(e) => updateSetting("maxTokens", parseInt(e.target.value))} className={`w-full ${isDark ? "accent-white" : "accent-gray-900"}`} />
                  </div>
                  <div>
                    <label className={`mb-1.5 block text-xs font-medium uppercase tracking-wider ${t.label}`}>Temperature: {settings.temperature.toFixed(1)}</label>
                    <input type="range" min="0" max="2" step="0.1" value={settings.temperature} onChange={(e) => updateSetting("temperature", parseFloat(e.target.value))} className={`w-full ${isDark ? "accent-white" : "accent-gray-900"}`} />
                  </div>
                </div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.enableFollowUp}
                    onChange={(e) => updateSetting("enableFollowUp", e.target.checked)}
                    className={`rounded ${isDark ? "border-line/30 bg-paper/50 text-white" : "border-gray-300 bg-white text-gray-900"} focus:ring-1 ${isDark ? "focus:ring-white/30" : "focus:ring-gray-900/30"}`}
                  />
                  <span className={`text-sm ${t.text}`}>Enable follow-up questions</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* UI Settings */}
        {activeTab === "ui" && (
          <div className="space-y-6 animate-fade-in">
            <div className={`${t.card} p-6`}>
              <h2 className={`mb-4 text-sm font-semibold`}>Panel Defaults</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={`mb-1.5 block text-xs font-medium uppercase tracking-wider ${t.label}`}>Default Width: {settings.panelWidth}px</label>
                  <input type="range" min="280" max="680" step="10" value={settings.panelWidth} onChange={(e) => updateSetting("panelWidth", parseInt(e.target.value))} className={`w-full ${isDark ? "accent-white" : "accent-gray-900"}`} />
                </div>
                <div>
                  <label className={`mb-1.5 block text-xs font-medium uppercase tracking-wider ${t.label}`}>Default Height: {settings.panelHeight}px</label>
                  <input type="range" min="180" max="640" step="10" value={settings.panelHeight} onChange={(e) => updateSetting("panelHeight", parseInt(e.target.value))} className={`w-full ${isDark ? "accent-white" : "accent-gray-900"}`} />
                </div>
              </div>
            </div>

            <div className={`${t.card} p-6`}>
              <h2 className={`mb-4 text-sm font-semibold`}>Theme</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { id: "dark" as const, label: "Dark", color: isDark ? "bg-paper" : "bg-gray-900" },
                  { id: "light" as const, label: "Light", color: isDark ? "bg-white/20" : "bg-gray-100" },
                  { id: "auto" as const, label: "Auto", color: isDark ? "bg-gradient-to-r from-paper to-white/20" : "bg-gradient-to-r from-gray-900 to-gray-100" }
                ].map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => updateSetting("theme", theme.id)}
                    className={`rounded-lg border p-4 transition-all ${
                      settings.theme === theme.id
                        ? `${t.accentBorder} ${t.accentBgLight}`
                        : `${t.line} ${isDark ? "bg-paper/50" : "bg-white"}`
                    }`}>
                    <div className={`mx-auto mb-2 h-12 w-full rounded-md ${theme.color} ${isDark ? "border border-white/20" : "border border-gray-300"}`} />
                    <div className="text-sm font-medium">{theme.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* About */}
        {activeTab === "about" && (
          <div className="animate-fade-in">
            <div className={`${t.card} p-6`}>
              <h2 className={`mb-4 text-sm font-semibold`}>About Context On Tabs</h2>
              <div className={`space-y-4 text-sm leading-relaxed ${t.dim}`}>
                <p>Context On Tabs is a professional browser extension that transforms how you interact with web content. Highlight any text to create AI-powered context panels that provide insights, explanations, and research assistance.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={`rounded-lg border ${t.line} ${isDark ? "bg-paper/50" : "bg-white"} p-4`}>
                    <h3 className={`mb-1 font-medium ${t.text}`}>Version</h3>
                    <p className="text-xs">1.0.0</p>
                  </div>
                  <div className={`rounded-lg border ${t.line} ${isDark ? "bg-paper/50" : "bg-white"} p-4`}>
                    <h3 className={`mb-1 font-medium ${t.text}`}>Technology</h3>
                    <p className="text-xs">Plasmo, React, TypeScript</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default Options
