import { z } from 'zod'
import { sourceSchema, type Source } from '../lib/research'

const responseSchema = z.object({
  pages: z.array(z.object({
    title: z.string(),
    key: z.string(),
    excerpt: z.string(),
    description: z.string().nullish(),
  })),
})

export async function searchWikipedia(query: string): Promise<Source[]> {
  const url = new URL('https://en.wikipedia.org/w/rest.php/v1/search/page')
  url.search = new URLSearchParams({ q: query, limit: '8' }).toString()
  const response = await fetch(url, {
    headers: { 'User-Agent': 'SourceShelf/0.1 (https://source-shelf.app.space)' },
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('Wikipedia search failed')
  const result = responseSchema.parse(await response.json())
  return result.pages.flatMap(({ title, key, excerpt, description }) => {
    const source = sourceSchema.safeParse({
      title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(key)}`,
      excerpt: excerpt.replace(/<\/?span\b[^>]*>/gi, '').trim() || description,
    })
    return source.success ? [source.data] : []
  })
}
