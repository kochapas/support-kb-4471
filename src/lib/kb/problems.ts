// The problems inside a merged ticket, read from what its reports say, not from their subject line.
//
// causes.ts already tells two bugs apart by tenant and way in: `parser` and `hint`. A third one hides
// under them: reports the desk read as a one-day move (desk-notes.json). A month/day swap never moves
// a date by one day, so those reports are their own problem: `shift`. Each problem has its own ticket.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'shift' | 'unplaced';

// Where the tickets live. One GitHub issue per problem.
export const TICKET_REPO = 'https://github.com/kochapas/support-kb-4471';

export const PROBLEMS: Record<Problem, { title: string; issue: number | null }> = {
  parser: { title: 'Shared parser reads day-first dates month first', issue: 1 },
  hint: { title: 'booking-v3 hint tells day-first tenants to type MM/DD/YYYY', issue: 2 },
  shift: { title: 'Invite dates move one day between time zones', issue: 3 },
  unplaced: { title: 'No day-first tenant on file: not placed', issue: null },
};

export const ORDER: readonly Problem[] = ['parser', 'hint', 'shift', 'unplaced'];

export function ticketUrl(p: Problem): string | null {
  const n = PROBLEMS[p].issue;
  return n === null ? null : `${TICKET_REPO}/issues/${n}`;
}

// One report, one problem. The desk's one-day reading wins over the tenant's cause: the cause
// says which bug the tenant can hit, the body says which one they did.
export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'shift';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: string[];
  channels: Record<string, number>;
  // What intake tagged these reports as: tag → count. Intake guesses from the reporter's browser.
  taggedAs: Record<string, number>;
  subjects: string[];
  firstSeen: string;
  lastSeen: string;
};

const tally = (xs: string[]) => xs.reduce<Record<string, number>>((n, x) => ({ ...n, [x]: (n[x] ?? 0) + 1 }), {});

export function mergedInto(reports: Report[], ticket: number): Report[] {
  return uniqueById(reports).filter((r) => r.mergedInto === ticket);
}

export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const by = new Map<Problem, Report[]>();
  for (const r of reports) {
    const p = problemOf(r, tenantOf(r), oneDayMove);
    by.set(p, [...(by.get(p) ?? []), r]);
  }
  return ORDER.filter((p) => by.has(p)).map((p) => {
    const rs = by.get(p)!;
    const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
    return {
      problem: p,
      reports: rs,
      tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
      channels: tally(rs.map((r) => r.channel)),
      taggedAs: tally(rs.map((r) => r.meta.intakeTag)),
      subjects: [...new Set(rs.map((r) => r.subject))].sort(),
      firstSeen: days[0],
      lastSeen: days[days.length - 1],
    };
  });
}

// Subject lines that turn up under more than one problem: the reason a subject match merged them.
export function sharedSubjects(groups: ProblemGroup[]): { subject: string; problems: Problem[] }[] {
  const seen = new Map<string, Problem[]>();
  for (const g of groups) for (const s of g.subjects) seen.set(s, [...(seen.get(s) ?? []), g.problem]);
  return [...seen.entries()]
    .filter(([, ps]) => ps.length > 1)
    .map(([subject, problems]) => ({ subject, problems }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}
