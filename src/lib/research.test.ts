import { describe, expect, it } from 'vitest'
import { citationExcerpt, excerptSummary, sourceExcerpt } from './research'

const wikipedia = { title: 'Evidence', url: 'https://en.wikipedia.org/wiki/Evidence' }

describe('Wikipedia excerpts', () => {
  it('decodes entities once and marks an unfinished snippet', () => {
    const source = { ...wikipedia, excerpt: '<span class="searchmatch">A</span> &quot;claim&quot; &#x26; &lt;img&gt; &amp;quot;' }
    expect(sourceExcerpt(source)).toBe('A "claim" & <img> &quot;…')
    const [citation] = excerptSummary([source])
    expect(citationExcerpt(citation)).toBe('A "claim" & <img> &quot;…')
  })

  it('preserves sentence punctuation and existing ellipses', () => {
    for (const excerpt of ['A complete sentence.', 'A quotation ends with &quot;done.&quot;', 'Already clipped…', 'Already clipped...']) {
      expect(sourceExcerpt({ ...wikipedia, excerpt })).toBe(excerpt.replaceAll('&quot;', '"'))
    }
    expect(excerptSummary([{ ...wikipedia, excerpt: '&quot;That is true.&quot; More context follows' }])[0].text)
      .toBe('"That is true."')
  })

  it('updates legacy citations on read and preserves literal text from other sites', () => {
    expect(citationExcerpt({ ...wikipedia, text: 'An &quot;old&quot; snippet' })).toBe('An "old" snippet…')
    expect(sourceExcerpt({ title: 'Manual source', url: 'https://example.com', excerpt: '&lt;img&gt;' })).toBe('&lt;img&gt;')
  })

  it('clips long summaries at a word boundary and shows the ellipsis', () => {
    const text = excerptSummary([{ ...wikipedia, excerpt: 'sample '.repeat(50) + 'finished.' }])[0].text
    expect(text.length).toBeLessThanOrEqual(300)
    expect(text).toMatch(/sample…$/)
  })
})
