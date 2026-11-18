import type { CollectionSchema } from 'deepspace/schema'

function text(name: string) {
  return { name, storage: 'text', interpretation: 'plain', required: true } as const
}

const closed = { read: false, create: false, update: false, delete: false } as const
const teamRead = { ...closed, read: 'team' } as const
const topicPermissions = { '*': closed, member: teamRead, viewer: teamRead, admin: teamRead }

export const researchSchemas: CollectionSchema[] = [
  {
    name: 'topics',
    columns: [text('title'), text('teamId')],
    teamField: 'teamId',
    permissions: topicPermissions,
  },
  {
    name: 'team_members',
    // These names match the SDK's membership lookup and resubscribe hook.
    columns: [text('TeamId'), text('UserId'), text('Status')],
    permissions: { '*': closed, member: closed, viewer: closed, admin: closed },
  },
  {
    name: 'research_entries',
    columns: [
      text('teamId'),
      text('kind'),
      { name: 'content', storage: 'text', interpretation: { kind: 'json' }, required: true },
    ],
    teamField: 'teamId',
    permissions: topicPermissions,
  },
]
