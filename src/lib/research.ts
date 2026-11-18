import { decodeHTMLStrict } from 'entities'
import { z } from 'zod'

export const sourceSchema = z.object({
  title: z.string().trim().min(1).max(240),
  url: z.url({ protocol: /^https?$/ }).max(2048),
  excerpt: z.string().trim().min(1).max(2000),
})

export type Source = z.infer<typeof sourceSchema>
export type Citation = Pick<Source, 'title' | 'url'> & { text: string; plainText?: true }
export type Entry = { teamId: string } & (
  | { kind: 'source'; content: Source }
  | { kind: 'note'; content: { body: string } }
  | { kind: 'summary'; content: { method: 'excerpts' | 'ai'; citations: Citation[] } }
)

const sentenceEnd = /(?<!\.)[.!?]["'”’»)]*(?=\s|$)/u

function isWikipedia(url: string) {
  return URL.canParse(url) && new URL(url).hostname === 'en.wikipedia.org'
}

function wikipediaText(value: string) {
  // Remove Wikipedia's match wrappers before decoding, then render the result as text.
  const text = decodeHTMLStrict(value.replace(/<\/?span\b[^>]*>/gi, '')).replace(/\s+/gu, ' ').trim()
  if (!text || /[.!?…]["'”’»)]*$/u.test(text)) return text
  return text + '…'
}

export function sourceExcerpt(source: Source) {
  return isWikipedia(source.url) ? wikipediaText(source.excerpt) : source.excerpt
}

export function citationExcerpt(citation: Citation) {
  // Older excerpt summaries can contain the original Wikipedia entities.
  return !citation.plainText && isWikipedia(citation.url) ? wikipediaText(citation.text) : citation.text
}

export function excerptSummary(sources: Source[]): Citation[] {
  return sources.map((source) => {
    const { title, url } = source
    const excerpt = sourceExcerpt(source)
    const ending = sentenceEnd.exec(excerpt)
    const firstSentence = ending ? excerpt.slice(0, ending.index + ending[0].length) : excerpt
    const characters = Array.from(firstSentence)
    const text = characters.length > 300
      ? characters.slice(0, 299).join('').replace(/\s+\S*$/u, '').trimEnd() + '…'
      : firstSentence
    return { title, url, text, plainText: true }
  })
}
