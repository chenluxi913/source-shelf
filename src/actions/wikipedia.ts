import { z } from 'zod'
import type { Source } from '../lib/research'
import { wikipediaSources } from '../lib/wikipedia'

export async function searchWikipedia(query: string): Promise<Source[]> {
  const url = new URL('https://en.wikipedia.org/w/rest.php/v1/search/page')
  url.search = new URLSearchParams({ q: query, limit: '8' }).toString()
  const response = await fetch(url, {
    headers: { 'User-Agent': 'SourceShelf/0.1 (https://source-shelf.app.space)' },
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('Wikipedia search failed')
  const result = z.object({ pages: z.unknown() }).parse(await response.json())
  return wikipediaSources(result.pages)
}
