import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useAuth, useQuery } from 'deepspace'
import { ArrowUpRight, BookOpen, FileText, Library, Plus, Search, Users } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { research, searchSources, type SearchProvider } from '@/lib/research-client'
import type { Entry, Source } from '@/lib/research'
import '@/shelf.css'

type Topic = { title: string; teamId: string }
type Mutation = { recordId: string }

function useOperation() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  return {
    pending, error,
    async run(work: () => Promise<void>) {
      setPending(true)
      setError('')
      try { await work() }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed. Try again.') }
      finally { setPending(false) }
    },
  }
}

function Feedback({ error }: { error: string }) {
  return error ? <p role="alert" className="shelf-error">{error}</p> : null
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  const headingId = useId()
  return <section className="shelf-panel" aria-labelledby={headingId}>
    <h2 id={headingId}>{icon}{title}</h2>
    {children}
  </section>
}

export default function HomePage() {
  const { userId } = useAuth()
  const topics = useQuery<Topic>('topics', { orderBy: 'createdAt', orderDir: 'desc' })
  const [params, setParams] = useSearchParams()
  const requested = params.get('topic')
  const active = requested ? topics.records.find((topic) => topic.recordId === requested) : topics.records[0]
  const create = useOperation()
  const [title, setTitle] = useState('')

  function createTopic(event: FormEvent) {
    event.preventDefault()
    void create.run(async () => {
      const result = await research<Mutation>('create', { title })
      setTitle('')
      setParams({ topic: result.recordId })
    })
  }

  return <div className="shelf">
    <aside className="shelf-sidebar">
      <h2><Library size={19} /> Topics</h2>
      <form onSubmit={createTopic}>
        <label htmlFor="topic-title">New topic</label>
        <div className="shelf-row">
          <input id="topic-title" required maxLength={100} placeholder="e.g. Distributed systems" value={title} onChange={(event) => setTitle(event.target.value)} />
          <button className="shelf-button shelf-primary" disabled={create.pending} aria-label="Create topic"><Plus size={18} /></button>
        </div>
        <Feedback error={create.error} />
      </form>
      <div className="shelf-topics">
        {topics.records.map((topic) => <button type="button" className="shelf-topic" key={topic.recordId}
          aria-current={active?.recordId === topic.recordId ? 'page' : undefined}
          onClick={() => setParams({ topic: topic.recordId })}>
          <BookOpen size={16} /> <span>{topic.data.title}</span>
        </button>)}
      </div>
      <details className="shelf-id">
        <summary>Your sharing ID</summary>
        <p>Give this ID to a topic owner so they can add you.</p>
        <input aria-label="Your sharing ID" readOnly value={userId ?? ''} onFocus={(event) => event.target.select()} />
      </details>
    </aside>
    <div className="shelf-main">
      {topics.status === 'loading' ? <p role="status">Loading topics…</p>
        : topics.status === 'error' ? <p role="alert">Could not load topics. Refresh the page to reconnect.</p>
        : active ? <TopicView key={active.recordId} topicId={active.recordId} title={active.data.title} owner={active.createdBy === userId} />
        : <div className="shelf-welcome">
          <BookOpen size={31} />
          <h1>{requested ? 'Topic unavailable' : 'Start a research topic'}</h1>
          <p>{requested ? 'Ask the owner for access, then reopen the topic.' : 'Find sources, keep notes, and turn selected evidence into a cited summary.'}</p>
        </div>}
    </div>
  </div>
}

function TopicView({ topicId, title, owner }: { topicId: string; title: string; owner: boolean }) {
  const entries = useQuery<Entry>('research_entries', { where: { teamId: topicId }, orderBy: 'createdAt', orderDir: 'desc' })
  const operation = useOperation()
  const [selected, setSelected] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [ai, setAi] = useState(false)
  const sources = entries.records.filter(({ data }) => data.kind === 'source')
  const selectedSources = selected.filter((id) => sources.some((source) => source.recordId === id))

  function addNote(event: FormEvent) {
    event.preventDefault()
    void operation.run(async () => {
      await research('note', { topicId, body: note })
      setNote('')
    })
  }

  return <>
    <header className="shelf-header">
      <div>
        <p className="shelf-kicker">Research workspace</p>
        <h1>{title}</h1>
        <p>{owner ? 'You own this topic' : 'Shared with you · Editor'}</p>
      </div>
      {owner && <Sharing topicId={topicId} />}
    </header>
    <div className="shelf-grid">
      <Discovery topicId={topicId} saved={sources.map(({ data }) => data.kind === 'source' ? data.content.url : '')} />
      <Panel title="Saved sources" icon={<BookOpen size={19} />}>
        {entries.status === 'loading' && <p role="status">Loading sources and notes…</p>}
        {entries.status === 'error' && <Feedback error="Could not load this topic’s entries. Refresh the page to reconnect." />}
        {entries.status === 'ready' && !sources.length && <p>Save a source to start collecting evidence.</p>}
        {!!sources.length && <p>Choose up to six sources for your summary.</p>}
        {sources.map(({ recordId, data }) => data.kind === 'source' && <article className="shelf-item" key={recordId}>
          <label className="shelf-check">
            <input type="checkbox" checked={selected.includes(recordId)} disabled={selected.length >= 6 && !selected.includes(recordId)}
              onChange={(event) => {
                const checked = event.target.checked
                setSelected((current) => checked ? [...current, recordId] : current.filter((id) => id !== recordId))
              }} />
            Select {data.content.title}
          </label>
          <SourceLink source={data.content} />
          <p className="shelf-excerpt">{data.content.excerpt}</p>
        </article>)}
        <label className="shelf-check">
          <input type="checkbox" checked={ai} onChange={(event) => setAi(event.target.checked)} />
          Use OpenAI (uses your DeepSpace credits and sends the selected excerpts)
        </label>
        <button className="shelf-button shelf-primary" disabled={!selectedSources.length || operation.pending}
          onClick={() => void operation.run(async () => {
            await research('summarize', { topicId, sources: selectedSources, ai })
          })}>{operation.pending ? 'Working…' : 'Generate summary'}</button>
      </Panel>
      <Panel title="Notes" icon={<FileText size={19} />}>
        <form onSubmit={addNote}>
          <label htmlFor="note">Add a note</label>
          <textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} required maxLength={4000} rows={3} />
          <button className="shelf-button" disabled={operation.pending}>Save note</button>
        </form>
        {entries.records.map(({ recordId, data }) => data.kind === 'note' && <p className="shelf-item shelf-note" key={recordId}>{data.content.body}</p>)}
      </Panel>
      <Panel title="Cited summaries" icon={<FileText size={19} />}>
        <Feedback error={operation.error} />
        {entries.status === 'ready' && !entries.records.some(({ data }) => data.kind === 'summary') && <p>Your summaries will appear here.</p>}
        {entries.records.map(({ recordId, data }) => data.kind === 'summary' && <article className="shelf-item" key={recordId}>
          <h3>{data.content.method === 'ai' ? 'AI synthesis' : 'Excerpt summary'}</h3>
          <ol>
            {data.content.citations.map((citation, index) => <li key={index}>
              <p>{citation.text} <SourceLink source={citation} /></p>
            </li>)}
          </ol>
        </article>)}
      </Panel>
    </div>
  </>
}

function SourceLink({ source }: { source: Pick<Source, 'title' | 'url'> }) {
  return <a className="shelf-source-link" href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight aria-hidden size={14} /></a>
}

function Discovery({ topicId, saved }: { topicId: string; saved: string[] }) {
  const [query, setQuery] = useState('')
  const [provider, setProvider] = useState<SearchProvider>('wikipedia')
  const [results, setResults] = useState<Source[] | null>(null)
  const search = useOperation()
  const save = useOperation()
  const [manual, setManual] = useState(false)
  const [added, setAdded] = useState<string[]>([])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setResults(null)
    void search.run(async () => {
      if (query.trim().length < 2) throw new Error('Enter at least two characters.')
      setResults(await searchSources(topicId, provider, query.trim()))
    })
  }

  async function saveSource(source: Source) {
    await research('save', { topicId, source })
    setAdded((current) => [...current, source.url])
  }

  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    void save.run(async () => {
      await saveSource({
        title: String(fields.get('title')), url: String(fields.get('url')), excerpt: String(fields.get('excerpt')),
      })
      form.reset()
      setManual(false)
    })
  }

  return <Panel title="Find sources" icon={<Search size={19} />}>
    <form onSubmit={submitSearch}>
      <label htmlFor="source-search">Search query</label>
      <div className="shelf-row">
        <input id="source-search" required maxLength={180} placeholder="Search by keyword" value={query} onChange={(event) => setQuery(event.target.value)} />
        <button className="shelf-button shelf-primary" disabled={search.pending}>{search.pending ? 'Searching…' : 'Search'}</button>
      </div>
      <label htmlFor="search-provider">Search provider</label>
      <select id="search-provider" value={provider} onChange={(event) => setProvider(event.target.value as SearchProvider)}>
        <option value="wikipedia">Wikipedia</option>
        <option value="exa">Exa · broader web · uses credits</option>
      </select>
    </form>
    <Feedback error={search.error} />
    {results?.length === 0 && <p role="status">No results with usable excerpts. Try a different query.</p>}
    {results?.map((source) => <article className="shelf-item" key={source.url}>
      <SourceLink source={source} />
      <p className="shelf-excerpt">{source.excerpt}</p>
      <button className="shelf-button" disabled={save.pending || saved.includes(source.url) || added.includes(source.url)}
        onClick={() => void save.run(() => saveSource(source))}>{saved.includes(source.url) || added.includes(source.url) ? 'Saved' : 'Save source'}</button>
    </article>)}
    <button className="shelf-button" aria-expanded={manual} onClick={() => setManual(!manual)}>{manual ? 'Close manual entry' : 'Add a source manually'}</button>
    {manual && <form onSubmit={submitManual}>
      <label htmlFor="manual-title">Source title</label><input id="manual-title" name="title" required maxLength={240} />
      <label htmlFor="manual-url">Source URL</label><input id="manual-url" name="url" type="url" required maxLength={2048} />
      <label htmlFor="manual-excerpt">Evidence excerpt</label><textarea id="manual-excerpt" name="excerpt" required maxLength={2000} rows={3} />
      <button className="shelf-button shelf-primary" disabled={save.pending}>{save.pending ? 'Saving…' : 'Save manual source'}</button>
    </form>}
    <Feedback error={save.error} />
  </Panel>
}

function Sharing({ topicId }: { topicId: string }) {
  const operation = useOperation()
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<string[]>([])
  const [recipient, setRecipient] = useState('')

  async function changeAccess(id: string, active: boolean) {
    await research('share', { topicId, recipient: id, active })
    setRecipient('')
    setMembers(await research<string[]>('access', { topicId }))
  }

  return <div className="shelf-sharing">
    <button className="shelf-button" aria-expanded={open} onClick={() => {
      setOpen(!open)
      if (!open) void operation.run(async () => setMembers(await research<string[]>('access', { topicId })))
    }}><Users size={16} /> Manage access</button>
    {open && <div className="shelf-access">
      <p>Only you and editors you add can open this topic. Editors can add sources, notes, and summaries.</p>
      <form onSubmit={(event) => {
        event.preventDefault()
        void operation.run(() => changeAccess(recipient, true))
      }}>
        <label htmlFor="editor-id">Collaborator’s sharing ID</label>
        <div className="shelf-row">
          <input id="editor-id" required maxLength={128} value={recipient} onChange={(event) => setRecipient(event.target.value)} />
          <button className="shelf-button shelf-primary" disabled={operation.pending}>Add editor</button>
        </div>
      </form>
      {operation.pending && <p role="status">Updating access…</p>}
      {!members.length && !operation.pending && <p>No editors added.</p>}
      {members.map((id) => <div className="shelf-member" key={id}>
        <code>{id}</code>
        <button className="shelf-button" disabled={operation.pending} onClick={() => void operation.run(() => changeAccess(id, false))}>Remove</button>
      </div>)}
      <Feedback error={operation.error} />
    </div>}
  </div>
}
