import { useCallback, useEffect, useMemo, useState } from 'react'
import { AiGenerator } from './AiGenerator'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { splitSlides } from './splitSlides'

const DEFAULT_MARKDOWN = `# Welcome to SlideForge

Paste markdown here. Use a line with only \`---\` between slides.

---

## Live preview

- Split on \`---\`
- Navigate with the buttons below
- **GitHub-flavored** markdown (tables, task lists, etc.)

| Step | Action        |
| ---- | ------------- |
| 1    | Write markdown |
| 2    | Separate slides |
| 3    | Present         |

---

### Tips

\`\`\`ts
const slides = markdown.split(/^---$/m)
\`\`\`

Happy building.
`

function App() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN)
  const [slideIndex, setSlideIndex] = useState(0)

  const slides = useMemo(() => splitSlides(markdown), [markdown])
  const total = slides.length
  const maxIdx = total > 0 ? total - 1 : 0
  const activeIndex = total === 0 ? 0 : Math.min(Math.max(0, slideIndex), maxIdx)
  const current = slides[activeIndex] ?? ''

  const goPrev = useCallback(() => {
    setSlideIndex((i) => {
      const clamped = Math.max(0, Math.min(maxIdx, i))
      return Math.max(0, clamped - 1)
    })
  }, [maxIdx])

  const goNext = useCallback(() => {
    setSlideIndex((i) => {
      const clamped = Math.max(0, Math.min(maxIdx, i))
      return Math.min(maxIdx, clamped + 1)
    })
  }, [maxIdx])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable)
      ) {
        return
      }
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goPrev, goNext])

  const applyGeneratedMarkdown = useCallback((md: string) => {
    setMarkdown(md)
    setSlideIndex(0)
  }, [])

  return (
    <div className="min-h-svh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <h1 className="text-xl font-semibold tracking-tight">SlideForge</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Markdown in, slides out. Separate slides with a line containing only{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">
            ---
          </code>
          .
        </p>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 pt-4 lg:px-6 lg:pt-6">
        <AiGenerator onApplyMarkdown={applyGeneratedMarkdown} />
      </div>

      <main className="mx-auto flex max-w-[1600px] flex-col gap-4 p-4 lg:h-[calc(100svh-10.5rem)] lg:flex-row lg:gap-6 lg:p-6 lg:pt-4">
        <section className="flex min-h-[220px] flex-1 flex-col lg:min-h-0">
          <label
            htmlFor="markdown-input"
            className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Markdown
          </label>
          <textarea
            id="markdown-input"
            className="min-h-[200px] flex-1 resize-y rounded-xl border border-slate-200 bg-white p-4 font-mono text-sm leading-relaxed text-slate-800 shadow-sm outline-none ring-indigo-500/0 transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 lg:min-h-0 lg:resize-none"
            spellCheck={false}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="# Title&#10;&#10;---&#10;&#10;## Next slide"
          />
        </section>

        <section className="flex flex-1 flex-col lg:min-h-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Preview
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {total === 0 ? 'No slides' : `Slide ${activeIndex + 1} of ${total}`}
              </span>
              <div className="flex rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={goPrev}
                  disabled={activeIndex <= 0 || total === 0}
                >
                  Previous
                </button>
                <span className="w-px bg-slate-200 dark:bg-slate-700" aria-hidden />
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={goNext}
                  disabled={activeIndex >= total - 1 || total === 0}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <div className="flex min-h-[240px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:min-h-0">
            {total === 0 ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Add some markdown to see a slide. Use{' '}
                <code className="mx-1 rounded bg-slate-100 px-1 font-mono dark:bg-slate-800">
                  ---
                </code>{' '}
                on its own line to add more slides.
              </div>
            ) : (
              <article className="slide-markdown flex-1 overflow-y-auto p-6 lg:p-10">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{current}</ReactMarkdown>
              </article>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
            Keyboard: <kbd className="rounded border border-slate-300 px-1 dark:border-slate-600">←</kbd>{' '}
            <kbd className="rounded border border-slate-300 px-1 dark:border-slate-600">→</kbd>
          </p>
        </section>
      </main>
    </div>
  )
}

export default App
