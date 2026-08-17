// DeepSeek V4 Flash — OpenAI-compatible chat completions API.
// https://api-docs.deepseek.com/ — base URL https://api.deepseek.com,
// endpoint /chat/completions, model "deepseek-v4-flash". Replaced Gemini
// here 2026-08-17: gemini-2.0-flash (the model every AI call in this app
// used) was shut down by Google on 2026-06-01, so that integration had
// been silently broken for ~2.5 months. DeepSeek V4 Flash is also
// meaningfully cheaper than Gemini's current-generation replacement
// models for this app's usage pattern (~$0.0005/call vs ~$0.003-0.006).

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? ''

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
