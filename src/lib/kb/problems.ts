// The problems inside a merged ticket, counted the way the desk counts: with its own code (causes.ts)
// and its own notes (desk-notes.json), not from the subject line.
//
// causes.ts files every report under the cause its tenant and way in point to: `parser` or `hint`.
// A third problem hides under them: reports the desk read as a one-day move (desk-notes.json). A
// month/day swap never moves a date by one day, so those reports are a problem of their own: `shift`.
// The desk counts a report where it is filed and footnotes the ones it read differently (`readAs`),
// so a `shift` report stays in its cause's count as well. Each problem has its own ticket.
import { causeOf, groupByCause, readAs, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'shift' | 'unplaced';

// Where the tickets live. One GitHub issue per problem.
export const TICKET_REPO = 'https://github.com/kochapas/support-kb-4471';

export const PROBLEMS: Record<Problem, { title: string; issue: number | null }> = {
  parser: { title: 'Shared parser reads day-first dates month first', issue: 1 },
  hint: { title: 'booking-v3 hint tells day-first tenants to type MM/DD/YYYY', issue: 2 },
  shift: { title: 'Invite dates move one day between time zones', issue: 3 },
  unplaced: { title: 'No day-first tenant on file: not placed', issue: null },
};

export const ORDER: readonly Problem[] = ['parser', 'hint', 'shift', 'unplaced'];

// What engineering did about each problem when it closed the merged ticket (engineering-4471.json).
// A problem it did not name is still open: closing #4471 did not reach it.
export type State = 'fixed' | "won't fix" | 'open';

export function stateOf(
  p: Problem,
  update: { problems: Partial<Record<string, { state: string; by: string }>> },
): { state: State; by: string | null } {
  const u = update.problems[p];
  return u ? { state: u.state as State, by: u.by } : { state: 'open', by: null };
}

export function ticketUrl(p: Problem): string | null {
  const n = PROBLEMS[p].issue;
  return n === null ? null : `${TICKET_REPO}/issues/${n}`;
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // Filed by cause (causes.ts): every report sits in exactly one of these. `shift` is not filed:
  // its reports are the ones the desk read as a one-day move, wherever they are filed.
  filed: boolean;
  tenants: string[];
  channels: Record<string, number>;
  // What intake tagged these reports as: tag → count. Intake guesses from the reporter's browser.
  taggedAs: Record<string, number>;
  // Reports this group shares with other problems: problem → count.
  shared: Partial<Record<Problem, number>>;
  firstSeen: string;
  lastSeen: string;
};

const tally = (xs: string[]) => xs.reduce<Record<string, number>>((n, x) => ({ ...n, [x]: (n[x] ?? 0) + 1 }), {});

function describe(problem: Problem, rs: Report[], filed: boolean, shared: ProblemGroup['shared']): ProblemGroup {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports: rs,
    filed,
    tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
    channels: tally(rs.map((r) => r.channel)),
    taggedAs: tally(rs.map((r) => r.meta.intakeTag)),
    shared,
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
  };
}

export function mergedInto(reports: Report[], ticket: number): Report[] {
  return uniqueById(reports).filter((r) => r.mergedInto === ticket);
}

// The desk's count per problem: its causes as groupByCause files them, plus the reports it read as a
// one-day move, counted again under `shift`.
export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const causes = groupByCause(reports, tenantOf);
  const groups = causes.map((g) => {
    const moved = readAs(g, oneDayMove);
    return describe(g.cause, g.reports, true, moved ? { shift: moved } : {});
  });
  const moved = reports.filter((r) => oneDayMove.includes(r.id));
  if (moved.length) {
    const filedUnder = Object.fromEntries(causes.filter((g) => readAs(g, oneDayMove)).map((g) => [g.cause, readAs(g, oneDayMove)]));
    groups.push(describe('shift', moved, false, filedUnder));
  }
  return ORDER.flatMap((p) => groups.filter((g) => g.problem === p));
}

// What a report is about, one problem each: `shift` if the desk read it as a one-day move, else its cause.
export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'shift';
  return causeOf(r, t) ?? 'unplaced';
}

// Subject lines that turn up under more than one problem: the reason a subject match merged them.
export function sharedSubjects(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { subject: string; problems: Problem[] }[] {
  const seen = new Map<string, Set<Problem>>();
  for (const r of reports) seen.set(r.subject, (seen.get(r.subject) ?? new Set()).add(problemOf(r, tenantOf(r), oneDayMove)));
  return [...seen.entries()]
    .filter(([, ps]) => ps.size > 1)
    .map(([subject, ps]) => ({ subject, problems: ORDER.filter((p) => ps.has(p)) }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}
