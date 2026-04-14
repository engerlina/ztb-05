import { useCallback, useEffect, useState } from 'react'
import { generateSlidesMarkdown } from './openaiClient'
import { formatUsd, SLIDEFORGE_CHAT_MODEL, type TokenUsage } from './openaiPricing'

const STORAGE_KEY = 'slideforge_openai_api_key'

type Props = {
  onApplyMarkdown: (markdown: string) => void
}

export function AiGenerator({ onApplyMarkdown }: Props) {
  const [apiKey, setApiKey] = useState('')
  const [topic, setTopic] = useState('')
  const [slideCount, setSlideCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [lastUsage, setLastUsage] = useState<{
    usage: TokenUsage
    estimatedCostUsd: number
    model: string
  } | null>(null)
  const [sessionTotals, setSessionTotals] = useState({
    prompt_tokens: 0,
    completion_tokens: 0,
    estimatedCostUsd: 0,
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setApiKey(saved)
    } catch {
      /* ignore */
    }
  }, [])

  const persistApiKey = useCallback((key: string) => {
    try {
      const t = key.trim()
      if (t) localStorage.setItem(STORAGE_KEY, t)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const handleGenerate = async () => {
    setError(null)
    const key = apiKey.trim()
    if (!key) {
      setError('Add your OpenAI API key (open API & usage below).')
      setDetailsOpen(true)
      return
    }
    if (!topic.trim()) {
      setError('Enter a topic for the deck.')
      return
    }
    persistApiKey(key)
    setLoading(true)
    try {
      const result = await generateSlidesMarkdown({
        apiKey: key,
        topic: topic.trim(),
        slideCount,
      })
      onApplyMarkdown(result.markdown)
      setLastUsage({
        usage: result.usage,
        estimatedCostUsd: result.estimatedCostUsd,
        model: result.model,
      })
      setSessionTotals((s) => ({
        prompt_tokens: s.prompt_tokens + result.usage.prompt_tokens,
        completion_tokens: s.completion_tokens + result.usage.completion_tokens,
        estimatedCostUsd: s.estimatedCostUsd + result.estimatedCostUsd,
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const detailsId = 'ai-generator-details'
  const disclosureId = 'ai-generator-disclosure'
  const detailsHeadingId = 'ai-generator-details-heading'

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 sm:min-w-[220px]">
          <label
            htmlFor="deck-topic"
            className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            Topic
          </label>
          <input
            id="deck-topic"
            type="text"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-indigo-500/0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            placeholder="e.g. Intro to climate policy for beginners"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-28">
          <label
            htmlFor="slide-count"
            className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            Slides
          </label>
          <input
            id="slide-count"
            type="number"
            min={1}
            max={40}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-indigo-500/0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            value={slideCount}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (Number.isFinite(v)) setSlideCount(Math.min(40, Math.max(1, v)))
            }}
          />
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
          <button
            type="button"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[140px]"
            onClick={() => void handleGenerate()}
            disabled={loading}
          >
            {loading ? 'Generating…' : 'Generate slides'}
          </button>
          <button
            id={disclosureId}
            type="button"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:w-auto"
            aria-expanded={detailsOpen}
            aria-controls={detailsId}
            onClick={() => setDetailsOpen((o) => !o)}
          >
            {detailsOpen ? 'Hide' : 'Show'} API & usage
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {detailsOpen && (
        <section
          id={detailsId}
          role="region"
          aria-labelledby={detailsHeadingId}
          className="rounded-xl border border-indigo-200/80 bg-indigo-50/50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30"
        >
          <h2
            id={detailsHeadingId}
            className="text-sm font-semibold text-indigo-900 dark:text-indigo-200"
          >
            AI deck (OpenAI)
          </h2>
          <p className="mt-1 text-xs text-indigo-800/80 dark:text-indigo-300/80">
            Bring your own API key. It is kept in this browser only (
            <code className="rounded bg-white/60 px-1 dark:bg-slate-900/60">localStorage</code>
            ). Calls go to OpenAI from your machine; in dev, Vite proxies requests to avoid CORS.
            Token counts come from the API response; dollar amounts are{' '}
            <strong>estimates</strong> using public{' '}
            <code className="font-mono">{SLIDEFORGE_CHAT_MODEL}</code> list prices (see{' '}
            <a
              className="text-indigo-700 underline underline-offset-2 dark:text-indigo-300"
              href="https://openai.com/api/pricing/"
              target="_blank"
              rel="noreferrer"
            >
              openai.com/api/pricing
            </a>
            ).
          </p>

          {!import.meta.env.DEV && (
            <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              Production builds may hit browser CORS when calling OpenAI directly. Use{' '}
              <code className="font-mono">npm run dev</code> for reliable AI generation, or add
              your own server proxy.
            </p>
          )}

          <div className="mt-3">
            <label
              htmlFor="openai-key"
              className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              OpenAI API key
            </label>
            <input
              id="openai-key"
              type="password"
              autoComplete="off"
              className="w-full max-w-xl rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-indigo-500/0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              placeholder="sk-…"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onBlur={() => persistApiKey(apiKey)}
            />
          </div>

          {(lastUsage || sessionTotals.prompt_tokens > 0) && (
            <div className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-white/90 p-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 sm:grid-cols-2">
              {lastUsage && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Last generation
                  </h3>
                  <dl className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt>Model</dt>
                      <dd className="font-mono text-right">{lastUsage.model}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Prompt tokens</dt>
                      <dd className="tabular-nums">
                        {lastUsage.usage.prompt_tokens.toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Completion tokens</dt>
                      <dd className="tabular-nums">
                        {lastUsage.usage.completion_tokens.toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Total tokens</dt>
                      <dd className="tabular-nums">
                        {lastUsage.usage.total_tokens.toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 border-t border-slate-200 pt-2 dark:border-slate-700">
                      <dt>Est. cost</dt>
                      <dd className="font-medium tabular-nums">
                        {formatUsd(lastUsage.estimatedCostUsd)}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  This session (all runs)
                </h3>
                <dl className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt>Prompt tokens</dt>
                    <dd className="tabular-nums">{sessionTotals.prompt_tokens.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Completion tokens</dt>
                    <dd className="tabular-nums">
                      {sessionTotals.completion_tokens.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Total tokens</dt>
                    <dd className="tabular-nums">
                      {(
                        sessionTotals.prompt_tokens + sessionTotals.completion_tokens
                      ).toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-slate-200 pt-2 dark:border-slate-700">
                    <dt>Est. cost (sum)</dt>
                    <dd className="font-medium tabular-nums">
                      {formatUsd(sessionTotals.estimatedCostUsd)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
