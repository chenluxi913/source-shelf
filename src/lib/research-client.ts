import { getAuthToken, integration } from 'deepspace'
import { z } from 'zod'
import { sourceSchema, type Source } from './research'

export async function research<T>(operation: string, fields: Record<string, unknown> = {}): Promise<T> {
  const token = await getAuthToken()
  if (!token) throw new Error('Sign in again to continue.')
  const response = await fetch('/api/actions/research', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, ...fields }),
  })
  const result = await response.json().catch(() => null) as { success?: boolean; error?: string; data?: T } | null
  if (!response.ok || !result?.success) {
    throw new Error(result?.error ?? 'SourceShelf could not complete the request. Try again.')
  }
  return result.data as T
}

export type SearchProvider = 'wikipedia' | 'exa'

export async function searchSources(topicId: string, provider: SearchProvider, query: string): Promise<Source[]> {
  if (provider === 'wikipedia') return research<Source[]>('wikipedia', { topicId, query })
  const result = await integration.post<unknown>('exa/search', {
    query, type: 'auto', numResults: 8, contents: { text: { maxCharacters: 1600, includeHtmlTags: false } },
  })
  if (!result.success) throw new Error(result.error)
  const data = z.object({ results: z.array(z.object({
    title: z.string(), url: z.string(), text: z.string().optional().nullable(),
  })) }).safeParse(result.data)
  if (!data.success) throw new Error('Exa returned an unexpected response. Try Wikipedia or add a source manually.')
  return data.data.results.flatMap(({ title, url, text }) => {
    const source = sourceSchema.safeParse({ title, url, excerpt: text?.slice(0, 2000) })
    return source.success ? [source.data] : []
  })
}
