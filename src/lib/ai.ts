import type { AiRequest, AiResponse, Settings } from "./types"

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
const GOOGLE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

export async function answerContext(
  request: AiRequest,
  settings: Settings
): Promise<AiResponse> {
  const context = `Page: ${request.selection.pageTitle}\nURL: ${request.selection.pageUrl}\n\nHighlighted context:\n${request.selection.text}`

  const userPrompt =
    request.prompt ?? "Explain this context and suggest next research branches."

  const messages = [
    ...(request.conversationHistory?.map((msg) => ({
      role: msg.role,
      content: msg.content
    })) ?? []),
    { role: "user" as const, content: `${context}\n\nUser prompt:\n${userPrompt}` }
  ]

  switch (settings.aiProvider) {
    case "openai":
      return callOpenAI(messages, settings)
    case "anthropic":
      return callAnthropic(messages, settings)
    case "google":
      return callGoogle(messages, settings)
    case "custom":
      return callCustom(messages, settings)
    default:
      throw new Error(`Unknown AI provider: ${settings.aiProvider}`)
  }
}

async function callOpenAI(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  settings: Settings
): Promise<AiResponse> {
  if (!settings.openaiApiKey) {
    return {
      model: "not-configured",
      text: "OpenAI API key not configured. Please add your API key in the extension settings."
    }
  }

  const systemMessage = { role: "system", content: settings.systemPrompt }
  const allMessages = [systemMessage, ...messages]

  const response = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.openaiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: settings.openaiModel,
      messages: allMessages,
      max_tokens: settings.maxTokens,
      temperature: settings.temperature
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(
      `OpenAI request failed: ${error?.error?.message ?? response.statusText}`
    )
  }

  const payload = await response.json()
  return {
    model: payload.model ?? settings.openaiModel,
    text: payload.choices?.[0]?.message?.content ?? "No response text returned."
  }
}

async function callAnthropic(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  settings: Settings
): Promise<AiResponse> {
  if (!settings.anthropicApiKey) {
    return {
      model: "not-configured",
      text: "Anthropic API key not configured. Please add your API key in the extension settings."
    }
  }

  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": settings.anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: settings.anthropicModel,
      system: settings.systemPrompt,
      messages: messages,
      max_tokens: settings.maxTokens,
      temperature: settings.temperature
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(
      `Anthropic request failed: ${error?.error?.message ?? response.statusText}`
    )
  }

  const payload = await response.json()
  return {
    model: payload.model ?? settings.anthropicModel,
    text: payload.content?.[0]?.text ?? "No response text returned."
  }
}

async function callGoogle(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  settings: Settings
): Promise<AiResponse> {
  if (!settings.googleApiKey) {
    return {
      model: "not-configured",
      text: "Google API key not configured. Please add your API key in the extension settings."
    }
  }

  const url = `${GOOGLE_URL}/${settings.googleModel}:generateContent?key=${settings.googleApiKey}`

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: settings.systemPrompt },
            ...messages.map((m) => ({ text: m.content }))
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: settings.maxTokens,
        temperature: settings.temperature
      }
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(
      `Google request failed: ${error?.error?.message ?? response.statusText}`
    )
  }

  const payload = await response.json()
  return {
    model: settings.googleModel,
    text:
      payload.candidates?.[0]?.content?.parts?.[0]?.text ??
      "No response text returned."
  }
}

async function callCustom(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  settings: Settings
): Promise<AiResponse> {
  if (!settings.customEndpoint) {
    return {
      model: "not-configured",
      text: "Custom endpoint not configured. Please add the endpoint URL in the extension settings."
    }
  }

  const response = await fetch(settings.customEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.customModel,
      messages: [{ role: "system", content: settings.systemPrompt }, ...messages],
      max_tokens: settings.maxTokens,
      temperature: settings.temperature
    })
  })

  if (!response.ok) {
    throw new Error(`Custom API request failed with status ${response.status}`)
  }

  const payload = await response.json()
  return {
    model: settings.customModel ?? "custom",
    text:
      payload.choices?.[0]?.message?.content ??
      payload.response ??
      "No response text returned."
  }
}
