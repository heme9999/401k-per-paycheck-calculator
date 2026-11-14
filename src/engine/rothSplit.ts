import type { ResolvedAgeBand, RothSplitResult } from './types';

function clampPercent(pct: number): number {
  if (!Number.isFinite(pct)) return 0;
  return Math.min(Math.max(pct, 0), 100);
}

/**
 * Splits future employee contributions into pre-tax and Roth, enforcing
 * SECURE 2.0 Section 603: if prior-year FICA wages exceeded $155,000 and
 * the participant is 50+, the catch-up portion above the base elective limit
 * must be contributed as Roth.
 */
export function computeRothSplit(params: {
  readonly futureEmployeeCents: number;
  readonly alreadyContributedCents: number;
  readonly baseLimitCents: number;
  readonly ageBand: ResolvedAgeBand;
  readonly userRothPercent: number;
  readonly priorYearFicaOver155k: boolean | null;
}): RothSplitResult {
  const futureCents = Math.max(0, Math.round(params.futureEmployeeCents));
  const alreadyCents = Math.max(0, Math.round(params.alreadyContributedCents));
  const baseLimit = Math.max(0, Math.round(params.baseLimitCents));
  const rothPct = clampPercent(params.userRothPercent);

  const mandatoryRothRuleApplies =
    params.priorYearFicaOver155k === true && params.ageBand !== 'under50';

  const projectedAnnualCents = alreadyCents + futureCents;
  const totalCatchUpInFutureCents = Math.min(
    futureCents,
    Math.max(0, projectedAnnualCents - baseLimit),
  );

  const forcedRothCatchUpCents = mandatoryRothRuleApplies
    ? totalCatchUpInFutureCents
    : 0;

  const discretionaryCents = futureCents - forcedRothCatchUpCents;
  const discretionaryRothCents = Math.round((discretionaryCents * rothPct) / 100);
  const rothCents = forcedRothCatchUpCents + discretionaryRothCents;
  const preTaxCents = futureCents - rothCents;

  return {
    preTaxCents,
    rothCents,
    forcedRothCatchUpCents,
    mandatoryRothRuleApplies,
  };
}
