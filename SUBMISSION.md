# SourceShelf | Internship exercise

SourceShelf brings source discovery, shared notes, and cited summaries into a single research topic. Sign in, create a topic, search Wikipedia, save a result, add a note, and generate an excerpt summary. Every item in the summary links to the source you selected.

**Live app** [source-shelf.app.space](https://source-shelf.app.space)

**Source of record** [DeepSpace Git remote](https://deploy-worker.deep.space/api/repo/app_01M7PCVDNQSMGM2ZNTMXZ0YVF6) (requires repository access). Production release #1 builds application commit `39d831f`. Setup details are in [README.md](README.md).

## Design and tradeoffs

- DeepSpace Auth provides the browser identity. The RecordRoom stores data and streams server-filtered changes. A topic starts owner-only. The owner grants or removes editor access using a collaborator's sharing ID.
- The UI reads through SDK subscriptions. Server actions validate inputs and authorize writes, since privileged DeepSpace record tools bypass collection policies. A contribution is its own record so collaborators can add notes independently.
- The default summary uses stored excerpts, so it works without an AI call and its wording can be traced to saved evidence. The optional model can paraphrase that evidence. Citations always use stored URLs. The excerpt generator uses snippets, so the source page still matters when you need more context.

## External services

| Service | Request path | Verification |
| --- | --- | --- |
| Wikipedia | The Worker fetches English Wikipedia’s public REST search endpoint directly at `https://en.wikipedia.org/w/rest.php/v1/search/page`. This path uses zero DeepSpace integration credits. | Live search verified by the agent, locally and in production. |
| Exa | The browser uses the DeepSpace SDK to call the integration proxy at `exa/search` for broader web search with excerpts. The signed-in caller pays. | Empty and error responses simulated. Live calls remain unverified. |
| OpenAI | The authenticated summary action calls the DeepSpace integration proxy at `openai/chat-completion` for optional synthesis with `gpt-4.1-mini`. It sends the selected source excerpts and bills the signed-in caller. | Live calls remain unverified. |

These are the only provider call paths in the research workflow. The scaffold includes Google, Composio, and Wikipedia proxy billing entries. The research workflow makes no calls to those proxy endpoints. DeepSpace Auth is used for sign-in. Manual source entry and excerpt summaries work without a paid provider call.

## Implementation and verification

**Agent work.** The coding agent implemented and deployed the workspace, including topic creation, source discovery and saving, notes, citation generation, and editor access controls. The agent also ran the checks below.

**Personal verification.** I have not personally verified the app, integrations, or test results yet.

**Agent test results.**

TypeScript, ESLint, the production build, three Vitest tests, and 13 local Playwright tests passed. The local browser checks exercised live Wikipedia search, source saving, note persistence, and citation links. With three different accounts, they checked that an outsider was denied, the editor's note appeared in the owner's open browser, and removing the editor's access hid the topic and blocked further writes. Three Playwright checks also passed against production using QA accounts, including the full core workflow and access test, the landing page, and signed-out sign-in controls. The local Exa empty and error responses were simulated. Live Exa and OpenAI calls remain unverified.
