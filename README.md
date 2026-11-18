# SourceShelf

SourceShelf is a collaborative research workspace built with React and DeepSpace. Create a topic, save search results or your own links with excerpts, add notes, and generate a short summary with clickable citations.

## Run locally

If your DeepSpace account has source access, clone with `npx deepspace clone source-shelf`.

Use a Node version supported by `package.json` and a DeepSpace developer account.

```sh
npm ci
npx deepspace auth whoami
npm run dev
```

Open the local address printed by the CLI and sign in to the app. The CLI session manages the deployment. The separate browser session identifies the person using the workspace. This checkout targets an existing DeepSpace app. To deploy an independent copy, choose a unique Wrangler name and initialize a separate app identity with `npx deepspace app init --new-id`.

## Demo the workflow

1. Create a topic and search Wikipedia. Save a result, or add a source manually with a public link and a relevant excerpt.
2. Select one or more saved sources and generate an excerpt summary. Each item links to the stored source URL.
3. Ask a collaborator to sign in and send you the value under **Your sharing ID**. Open **Manage access** to add that person as an editor. Share the topic URL so they can open it directly. Editors can add sources, notes, and summaries. The owner can remove access.

## Read the code

| Area | Where to look |
| --- | --- |
| Workspace and forms | `src/pages/(app)/(protected)/home.tsx` |
| Records and access policies | `src/schemas/research-schema.ts` |
| Validation, membership, and writes | `src/actions/index.ts` |
| Wikipedia request and normalization | `src/actions/wikipedia.ts` |
| Exa response normalization and authenticated requests | `src/lib/research-client.ts` |
| Citation shape and excerpt summaries | `src/lib/research.ts` |

DeepSpace stores topics, membership rows, and research entries in its RecordRoom. A topic ID doubles as the SDK team ID. The RecordRoom filters reads for every role, and `useQuery` subscribes to those filtered results. The actions check membership before using privileged record tools. Each contribution is a separate row and is stored under the topic owner, so a removed editor loses the SDK's implicit creator access to their contributions too.

The excerpt summary selects up to six saved excerpts and uses the first sentence or a short clipped passage from each. The AI option sends only selected excerpts. It accepts structured claims linked to source numbers, then builds citation URLs from saved records. The model can still misinterpret evidence. Check each claim against its citation.

| Integration | Purpose | Billing |
| --- | --- | --- |
| Wikipedia REST search | Default reference search | Public Wikimedia endpoint, no DeepSpace integration credits |
| Exa via DeepSpace | Broader web search with supporting text | Optional, caller pays |
| OpenAI via DeepSpace | Paraphrased synthesis of selected excerpts | Optional, caller pays |

## Checks and deploy

```sh
npm run validate
npm run lint
npm run build
npx deepspace test run all
npx deepspace deploy
```

The collaboration checks use three accounts in the DeepSpace test account pool. Create them with `npx deepspace test accounts create --help` and pass the generated passwords over stdin. The workflow test hits live Wikipedia. The Exa error and empty-state test stubs the provider response and spends no credits.

Commit before deploying. The first release syncs the commit to the DeepSpace cloud repository through the `space` remote. See [SUBMISSION.md](SUBMISSION.md) for the exercise writeup.
