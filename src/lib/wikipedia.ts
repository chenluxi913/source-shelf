import { z } from 'zod'
import { sourceSchema, type Source } from './research'

const pagesSchema = z.array(z.object({
  title: z.string().nullish(),
  key: z.string().nullish(),
  excerpt: z.string().nullish(),
  description: z.string().nullish(),
}))

export function wikipediaSources(pages: unknown): Source[] {
  return pagesSchema.parse(pages).flatMap(({ title, key, excerpt, description }) => {
    if (!key) return []
    const source = sourceSchema.safeParse({
      title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(key)}`,
      excerpt: excerpt?.trim() || description,
    })
    return source.success ? [source.data] : []
  })
}
