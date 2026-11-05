# kb — the support knowledge base

**kb** = knowledge base. What the support desk knows about how our products break, written
down where the code can keep it honest.

One desk takes reports for every product we run: `sched-prod` (calendar invites for about
300k people) and the rest. When something
goes wrong, the reports reach the desk first. This kb is how the desk triages them, what each
incident turned out to be, and why we decided what we decided.

## What's here

```
src/routes/kb/      the pages (.svx: Markdown with components)
  triage/           how the desk handles incoming reports
  incidents/        one page per big ticket
  decisions/        numbered decision records
src/lib/kb/         components and the logic they run
src/lib/layouts/    the frame every page shares
src/lib/data/       exports from the ticket system
```

## Conventions

- Words in the page, logic in `src/lib` (imported as `#lib/…`). A number that can be computed belongs in a component.
- Every page starts with frontmatter: `title`, `owner`, `status`, `reviewed`.
- A decision is never edited after it is accepted. A new record replaces it.
- A page you add is signed: its frontmatter carries your `signature` and it ends with `<RenderStamp {signature} />`, so the desk knows who wrote it.

## Owners

Support desk. Decision records: whoever signed them.

---

Exported 2026-10-04 from the `support` repo, `apps/kb/` → `src/`.

## #4471, split (added 2026-11-06)

`#4471` holds three problems, not one. Each has its own ticket in this repo's issues, with how many reports it covers.

- Page: `src/routes/kb/incidents/4471-split/+page.svx`, logic in `src/lib/kb/problems.ts` and `src/lib/kb/ProblemTable.svelte`.
- The page as the desk sees it: `rendered/site/kb/incidents/4471-split.html` (static build) and `rendered/4471-split.png` (screenshot).
- Build it yourself: `nvm use && npm ci && npm run build` (Node 22.17+), then open `build/kb/incidents/4471-split.html`, or `npm run dev` and go to `/kb/incidents/4471-split`.
