/** Model used for slide generation — keep in sync with `openaiClient.ts`. */
export const SLIDEFORGE_CHAT_MODEL = 'gpt-4o-mini' as const

/**
 * Approximate public list prices (USD per 1M tokens) for gpt-4o-mini.
 * OpenAI can change pricing; treat estimates as indicative — see openai.com/api/pricing.
 */
export const GPT_4O_MINI_USD_PER_1M = {
  input: 0.15,
  output: 0.6,
} as const

export type TokenUsage = {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export function estimateGpt4oMiniUsd(usage: TokenUsage): number {
  const inputCost = (usage.prompt_tokens / 1_000_000) * GPT_4O_MINI_USD_PER_1M.input
  const outputCost = (usage.completion_tokens / 1_000_000) * GPT_4O_MINI_USD_PER_1M.output
  return inputCost + outputCost
}

export function formatUsd(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '$0.00'
  if (amount < 0.000_005) return '<$0.00001'
  const digits = amount < 0.01 ? 5 : amount < 1 ? 4 : 3
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  }).format(amount)
}
