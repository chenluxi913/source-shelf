import type { ActionResult } from 'deepspace/worker'
import type { Env } from '../../worker'

export async function executeActionRecord<TData>(
  env: Env,
  userId: string,
  tool: string,
  params: Record<string, unknown>,
): Promise<ActionResult<TData>> {
  const stub = env.RECORD_ROOMS.get(env.RECORD_ROOMS.idFromName(`app:${env.DEEPSPACE_APP_ID}`))
  const res = await stub.fetch(new Request('https://internal/api/tools/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
      'X-App-Action': 'true',
    },
    body: JSON.stringify({ tool, params }),
  }))
  return res.json() as Promise<ActionResult<TData>>
}
