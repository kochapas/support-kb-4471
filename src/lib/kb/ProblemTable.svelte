<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { groupByProblem, mergedInto, PROBLEMS, sharedSubjects, ticketUrl } from '#lib/kb/problems';

  // `show`: how many reports to quote under each problem.
  let { ticket, show = 2 }: { ticket: number; show?: number } = $props();

  const merged = $derived(mergedInto(reports as Report[], ticket));
  const groups = $derived(groupByProblem(merged, tenantOf, notes.oneDayMove));
  const filed = $derived(groups.filter((g) => g.filed).reduce((n, g) => n + g.reports.length, 0));
  const tickets = $derived(groups.filter((g) => PROBLEMS[g.problem].issue !== null).length);
  const allSubjects = $derived(new Set(merged.map((r) => r.subject)).size);
  const shared = $derived(sharedSubjects(merged, tenantOf, notes.oneDayMove));
  const also = (g: { shared: Partial<Record<string, number>> }) =>
    Object.entries(g.shared)
      .map(([p, n]) => `${n} also in ${p}`)
      .join(' · ');
  const list = (n: Record<string, number>) =>
    Object.entries(n)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ×${v}`)
      .join(' · ');
  const quotes = (rs: Report[]) => [...rs].sort((a, b) => a.id.localeCompare(b.id)).slice(0, show);
</script>

<p class="sum">
  <strong>{merged.length}</strong> reports merged into #{ticket} ·
  <strong>{groups.length}</strong> {groups.length === 1 ? 'problem' : 'problems'} ·
  <strong>{tickets}</strong> {tickets === 1 ? 'ticket' : 'tickets'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>came in by</th><th>intake tagged</th><th>seen</th><th>shared</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      {@const url = ticketUrl(g.problem)}
      <tr class:none={!url}>
        <td><code>{g.problem}</code><br /><span class="title">{PROBLEMS[g.problem].title}</span></td>
        <td class="n">{g.reports.length}</td>
        <td class="n">{g.tenants.length}</td>
        <td class="small">{list(g.channels)}</td>
        <td class="small">{list(g.taggedAs)}</td>
        <td class="small">{g.firstSeen} → {g.lastSeen}</td>
        <td class="small">{also(g)}</td>
        <td>{#if url}<a href={url}>#{PROBLEMS[g.problem].issue}</a>{:else}none{/if}</td>
      </tr>
    {/each}
  </tbody>
  <tfoot>
    <tr><td>filed by cause</td><td class="n">{filed}</td><td colspan="6" class="small">{filed === merged.length ? `every report in #${ticket} is filed under one cause; shift counts the ones the desk read as a one-day move again` : `${merged.length - filed} reports not filed — check causes.ts`}</td></tr>
  </tfoot>
</table>

<p class="note">
  {shared.length} of {allSubjects} subject lines turn up under more than one problem{shared.length ? ':' : '.'}
  {#each shared as s, i (s.subject)}<q>{s.subject}</q> ({s.problems.join(', ')}){i < shared.length - 1 ? ' · ' : '.'}{/each}
</p>

{#each groups as g (g.problem)}
  <section>
    <h3><code>{g.problem}</code> · {PROBLEMS[g.problem].title}</h3>
    <p class="small">tenants: {g.tenants.join(', ')}</p>
    {#each quotes(g.reports) as r (r.id)}
      <blockquote><span class="id">{r.id} · {r.tenant} · {r.channel}</span> {r.body}</blockquote>
    {/each}
  </section>
{/each}

<style>
  .sum { font-size: 1.1rem; }
  .n { text-align: right; font-variant-numeric: tabular-nums; }
  .small, .title { color: var(--muted); font-size: 0.85em; }
  .note { color: var(--muted); font-size: 0.85em; }
  .none td { background: var(--warn-bg); }
  tfoot td { font-weight: 600; border-bottom: none; }
  section h3 { font-size: 1rem; margin: 1.5rem 0 0.25rem; }
  blockquote { margin: 0.4rem 0; padding: 0.3rem 0.8rem; border-left: 3px solid var(--line); }
  .id { display: block; font: 0.75rem var(--mono); color: var(--muted); }
</style>
