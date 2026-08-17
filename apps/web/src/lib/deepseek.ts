// DeepSeek V4 Flash — OpenAI-compatible chat completions API.
// https://api-docs.deepseek.com/ — base URL https://api.deepseek.com,
// endpoint /chat/completions, model "deepseek-v4-flash". Replaced Gemini
// here 2026-08-17: gemini-2.0-flash (the model every AI call in this app
// used) was shut down by Google on 2026-06-01, so that integration had
// been silently broken for ~2.5 months. DeepSeek V4 Flash is also
// meaningfully cheaper than Gemini's current-generation replacement
// models for this app's usage pattern (~$0.0005/call vs ~$0.003-0.006).

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? ''

// deepseek-v4-flash is a reasoning model by default — it spends
// completion tokens on hidden `reasoning_content` before writing the
// actual `message.content`, and `max_tokens` caps both combined.
// Confirmed directly against the real API 2026-08-17: even a 4000-token
// budget was fully consumed by reasoning on a real blog-post prompt,
// leaving zero room for the actual answer (empty content,
// finish_reason "length"). `thinking: { type: "disabled" }` skips
// reasoning entirely — confirmed this produces the full expected output
// directly, using far fewer tokens (a real 800-word blog post used
// ~1500 completion tokens with thinking disabled, vs. reasoning alone
// exhausting a 4000-token budget with thinking enabled and enabled).
export async function callDeepSeek(
  prompt: string,
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  if (!DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY not configured')

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: opts.maxTokens ?? 2000,
      temperature: opts.temperature ?? 0.5,
      thinking: { type: 'disabled' },
    }),
  })

  const json = await res.json()
  const text = json.choices?.[0]?.message?.content?.trim() ?? ''
  if (!res.ok || !text) {
    throw new Error(json.error?.message ?? `DeepSeek call failed (HTTP ${res.status})`)
  }
  return text
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

// Multi-turn variant for conversational callers (Phase 37 website bot) —
// callDeepSeek() above only ever sends one user message, so it can't carry
// a system prompt + prior turns. Same reasoning-mode caveat applies.
export async function callDeepSeekChat(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  if (!DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY not configured')

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages,
      max_tokens: opts.maxTokens ?? 500,
      temperature: opts.temperature ?? 0.5,
      thinking: { type: 'disabled' },
    }),
  })

  const json = await res.json()
  const text = json.choices?.[0]?.message?.content?.trim() ?? ''
  if (!res.ok || !text) {
    throw new Error(json.error?.message ?? `DeepSeek call failed (HTTP ${res.status})`)
  }
  return text
}

/** True if the DeepSeek key is configured — callers use this to fall back gracefully. */
export function deepseekConfigured(): boolean {
  return !!DEEPSEEK_API_KEY
}
