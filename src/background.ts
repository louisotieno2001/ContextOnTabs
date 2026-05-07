import { answerContext } from "./lib/ai"
import { loadSettings } from "./lib/storage"
import type { AiRequest } from "./lib/types"

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    "cots.install": {
      installedAt: new Date().toISOString(),
      version: chrome.runtime.getManifest().version
    }
  })
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "COTS_AI_REQUEST") {
    return false
  }

  loadSettings()
    .then((settings) => answerContext(message.payload as AiRequest, settings))
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error: Error) =>
      sendResponse({
        ok: false,
        error: error.message
      })
    )

  return true
})
