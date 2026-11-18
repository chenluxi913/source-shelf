import { z } from 'zod'

export const sourceSchema = z.object({
  title: z.string().trim().min(1).max(240),
  url: z.url({ protocol: /^https?$/ }).max(2048),
  excerpt: z.string().trim().min(1).max(2000),
})

export type Source = z.infer<typeof sourceSchema>
export type Citation = Pick<Source, 'title' | 'url'> & { text: string }
export type Entry = { teamId: string } & (
  | { kind: 'source'; content: Source }
  | { kind: 'note'; content: { body: string } }
  | { kind: 'summary'; content: { method: 'excerpts' | 'ai'; citations: Citation[] } }
)

export function excerptSummary(sources: Source[]): Citation[] {
  return sources.map(({ title, url, excerpt }) => {
    const firstSentence = excerpt.match(/^.*?[.!?](?=\s|$)/s)?.[0] ?? excerpt
    const text = firstSentence.length > 300 ? firstSentence.slice(0, 297).trimEnd() + '…' : firstSentence
    return { title, url, text }
  })
}
