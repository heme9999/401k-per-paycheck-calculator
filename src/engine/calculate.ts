import type { YearLimits } from '../config/limits';
import { buildTargetBreakdown, computeScheduleAndProjection } from './contributions';
import { ALL_AGE_BANDS } from './limits';
import { summarizeEmployerMatch } from './match';
import { toCents } from './money';
import { getStandardPayPeriods } from './payPeriods';
import { computeRothSplit } from './rothSplit';
import { computeTakeHomeEstimate } from './takeHome';
import type {
  CalculationResult,
  CalculatorInputs,
  TargetBreakdown,
} from './types';

/**
 * Pure calculation entry point:
 * Inputs + YearLimits -> CalculationResult
 * No DOM access, no Date.now(), deterministic integer-cents math.
 */
export function calculate(
  inputs: CalculatorInputs,
  limits: YearLimits,
): CalculationResult {
  const totalPayPeriodsInYear = getStandardPayPeriods(
    inputs.payFrequency,
    inputs.hasExtraPaycheck,
  );
  const remainingPaychecks = Math.max(
    0,
    Math.min(Math.floor(inputs.remainingPaychecks), totalPayPeriodsInYear),
  );

  const grossSalaryCents =
    inputs.grossSalaryDollars !== null && inputs.grossSalaryDollars > 0
      ? toCents(inputs.grossSalaryDollars)
      : 0;
  const grossPaycheckCents =
    grossSalaryCents > 0
      ? Math.round(grossSalaryCents / totalPayPeriodsInYear)
      : 0;

  const alreadyContributedCents =
    Math.max(0, toCents(inputs.ytdCurrentEmployerDollars)) +
    Math.max(0, toCents(inputs.priorEmployerDollars));

  const allTargets: TargetBreakdown[] = ALL_AGE_BANDS.map((band) =>
    buildTargetBreakdown({
      ageBand: band,
      limits,
      alreadyContributedCents,
      remainingPaychecks,
      grossPaycheckCents,
    }),
  );

  const selectedTarget =
    inputs.ageBand !== null
      ? (allTargets.find((t) => t.ageBand === inputs.ageBand) ?? allTargets[0]!)
      : null;

  // When ageBand is unselected, use under50 as the baseline for schedule/status
  // while exposing all three targets in `allTargets` so UI shows all 3 side by side.
  const effectiveTarget = selectedTarget ?? allTargets[0]!;

  const projection = computeScheduleAndProjection({
    mode: inputs.mode,
    target: effectiveTarget,
    remainingPaychecks,
    grossPaycheckCents,
    contributionUnit: inputs.contributionUnit,
    contributionValue: inputs.contributionValue,
    rothPercent: inputs.rothPercent,
    priorYearFicaOver155k: inputs.priorYearFicaOver155k,
    matchRatePercent: inputs.employerMatchRatePercent,
    matchCapPercent: inputs.employerMatchCapPercent,
  });

  const totalFutureEmployeeCents = projection.schedule.reduce(
    (sum, row) => sum + row.employeeCents,
    0,
  );

  const rothSplit = computeRothSplit({
    futureEmployeeCents: totalFutureEmployeeCents,
    alreadyContributedCents,
    baseLimitCents: effectiveTarget.baseLimitCents,
    ageBand: effectiveTarget.ageBand,
    userRothPercent: inputs.rothPercent,
    priorYearFicaOver155k: inputs.priorYearFicaOver155k,
  });

  const match = summarizeEmployerMatch({
    paycheckEmployeeAmountsCents: projection.schedule.map(
      (r) => r.employeeCents,
    ),
    grossPaycheckCents,
    matchRatePercent: inputs.employerMatchRatePercent,
    matchCapPercent: inputs.employerMatchCapPercent,
    trueUp: inputs.trueUp,
  });

  const firstRow = projection.schedule[0];
  const takeHome = computeTakeHomeEstimate({
    regularPreTaxCents: firstRow ? firstRow.preTaxCents : 0,
    regularRothCents: firstRow ? firstRow.rothCents : 0,
    federalMarginalRatePercent: inputs.federalMarginalRatePercent,
    stateMarginalRatePercent: inputs.stateMarginalRatePercent,
  });

  const regularPaycheckPercentOfPay =
    grossPaycheckCents > 0
      ? (projection.regularPaycheckCents / grossPaycheckCents) * 100
      : null;

  return {
    limits,
    totalPayPeriodsInYear,
    remainingPaychecks,
    selectedAgeBand: inputs.ageBand,
    target: selectedTarget,
    allTargets,
    status: projection.status,
    regularPaycheckCents: projection.regularPaycheckCents,
    finalPaycheckCents: projection.finalPaycheckCents,
    regularPaycheckPercentOfPay,
    uncappedProjectedAnnualEmployeeCents:
      projection.uncappedProjectedAnnualEmployeeCents,
    cappedProjectedAnnualEmployeeCents:
      projection.cappedProjectedAnnualEmployeeCents,
    shortfallCents: projection.shortfallCents,
    excessCents: projection.excessCents,
    overPriorEmployerLimitCents: projection.overPriorEmployerLimitCents,
    rothSplit,
    match,
    takeHome,
    schedule: projection.schedule,
  };
}
