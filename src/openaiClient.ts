import {
  estimateGpt4oMiniUsd,
  SLIDEFORGE_CHAT_MODEL,
  type TokenUsage,
} from './openaiPricing'

/** Dev server proxies `/openai` → api.openai.com to avoid browser CORS. */
function chatCompletionsUrl(): string {
  return import.meta.env.DEV
    ? '/openai/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions'
}

function stripCodeFences(text: string): string {
  let s = text.trim()
  const fence = /^```(?:markdown|md)?\s*\n?([\s\S]*?)\n?```$/i
  const m = s.match(fence)
  if (m) s = m[1].trim()
  return s
}

export type GenerateSlidesParams = {
  apiKey: string
  topic: string
  slideCount: number
}

export type GenerateSlidesResult = {
  markdown: string
  model: string
  usage: TokenUsage
  /** Rough USD from public gpt-4o-mini list prices; invoice may differ. */
  estimatedCostUsd: number
}

function parseUsage(data: unknown): TokenUsage {
  const u = (data as { usage?: Partial<TokenUsage> })?.usage
  const prompt = typeof u?.prompt_tokens === 'number' ? u.prompt_tokens : 0
  const completion =
    typeof u?.completion_tokens === 'number' ? u.completion_tokens : 0
  const total =
    typeof u?.total_tokens === 'number'
      ? u.total_tokens
      : prompt + completion
  return {
    prompt_tokens: prompt,
    completion_tokens: completion,
    total_tokens: total,
  }
}

export async function generateSlidesMarkdown(
  params: GenerateSlidesParams,
): Promise<GenerateSlidesResult> {
  const { apiKey, topic, slideCount } = params
  const n = Math.min(40, Math.max(1, Math.floor(slideCount)))

  const system = `You write markdown slide decks for SlideForge.

Output rules (strict):
- Output ONLY markdown. No preamble, no closing commentary.
- Produce exactly ${n} slides.
- Separate slides with a single line containing only three hyphens: ---
- Do not use a line that is only --- inside a slide for any other purpose.
- Start with the first slide's content (typically a # title for the deck or opening slide).
- Use clear headings, bullets, and optional tables where helpful. Keep each slide readable in ~1–2 minutes.`

  const user = `Topic:\n${topic.trim()}`

  const res = await fetch(chatCompletionsUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: SLIDEFORGE_CHAT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
    }),
  })

  const raw = await res.text()
  let data: unknown
  try {
    data = JSON.parse(raw) as unknown
  } catch {
    throw new Error(raw.slice(0, 200) || `Request failed (${res.status})`)
  }

  if (!res.ok) {
    const err = data as { error?: { message?: string } }
    const msg = err.error?.message ?? `Request failed (${res.status})`
    throw new Error(msg)
  }

  const parsed = data as {
    model?: string
    choices?: Array<{ message?: { content?: string | null } }>
  }
  const content = parsed.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('No markdown content in API response')
  }

  const usage = parseUsage(data)
  const model = typeof parsed.model === 'string' ? parsed.model : SLIDEFORGE_CHAT_MODEL
  const estimatedCostUsd = estimateGpt4oMiniUsd(usage)

  return {
    markdown: stripCodeFences(content),
    model,
    usage,
    estimatedCostUsd,
  }
}
