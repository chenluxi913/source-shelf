import { getAuthToken, integration } from 'deepspace'
import { wikipediaSources } from './wikipedia'
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

export type SearchProvider = 'wikipedia' | 'wikipedia-proxy' | 'exa'

export async function searchSources(topicId: string, provider: SearchProvider, query: string): Promise<{ sources: Source[]; notice?: string }> {
  if (provider === 'wikipedia' || provider === 'wikipedia-proxy') {
    let notice: string | undefined
    if (provider === 'wikipedia-proxy') {
      try {
        const result = await integration.post<unknown>('wikipedia/search-pages', { query, limit: 8 }, { timeoutMs: 10000 })
        if (result.success) return { sources: wikipediaSources(result.data) }
        notice = result.code === 'insufficient_credits'
          ? 'Not enough DeepSpace credits. Used direct Wikipedia search.'
          : 'DeepSpace Wikipedia search was unavailable. Used direct Wikipedia search.'
      } catch {
        notice = 'DeepSpace Wikipedia search was unavailable. Used direct Wikipedia search.'
      }
    }
    try {
      return { sources: await research<Source[]>('wikipedia', { topicId, query }), notice }
    } catch (error) {
      if (notice) throw new Error('Both Wikipedia search options are unavailable. Try again or add a source manually.')
      throw error
    }
  }
  const result = await integration.post<unknown>('exa/search', {
    query, type: 'auto', numResults: 8, contents: { text: { maxCharacters: 1600, includeHtmlTags: false } },
  })
  if (!result.success) throw new Error(result.error)
  const data = z.object({ results: z.array(z.object({
    title: z.string(), url: z.string(), text: z.string().optional().nullable(),
  })) }).safeParse(result.data)
  if (!data.success) throw new Error('Exa returned an unexpected response. Try Wikipedia or add a source manually.')
  const sources = data.data.results.flatMap(({ title, url, text }) => {
    const source = sourceSchema.safeParse({ title, url, excerpt: text?.slice(0, 2000) })
    return source.success ? [source.data] : []
  })
  return { sources }
}
