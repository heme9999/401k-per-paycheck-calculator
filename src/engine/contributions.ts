import type { YearLimits } from '../config/limits';
import { splitEvenlyWithFinalAdjustment } from './finalPaycheck';
import {
  getAnnualAdditions415cLimitCents,
  getApplicableLimitCents,
  getBaseElectiveLimitCents,
  getCatchUpPortionCents,
} from './limits';
import { computeEmployerMatchForPaycheck } from './match';
import { percentOfCents, toCents } from './money';
import { computeRothSplit } from './rothSplit';
import type {
  CalcMode,
  ContributionUnit,
  PaycheckScheduleRow,
  ProjectionStatus,
  ResolvedAgeBand,
  TargetBreakdown,
} from './types';

export function buildTargetBreakdown(params: {
  readonly ageBand: ResolvedAgeBand;
  readonly limits: YearLimits;
  readonly alreadyContributedCents: number;
  readonly remainingPaychecks: number;
  readonly grossPaycheckCents: number;
}): TargetBreakdown {
  const {
    ageBand,
    limits,
    alreadyContributedCents,
    remainingPaychecks,
    grossPaycheckCents,
  } = params;

  const annualLimitCents = getApplicableLimitCents(limits, ageBand);
  const baseLimitCents = getBaseElectiveLimitCents(limits);
  const catchUpLimitCents = getCatchUpPortionCents(limits, ageBand);
  const annualAdditions415cLimitCents = getAnnualAdditions415cLimitCents(
    limits,
    ageBand,
  );

  const safeAlready = Math.max(0, alreadyContributedCents);
  const remainingRoomCents = Math.max(0, annualLimitCents - safeAlready);
  const split = splitEvenlyWithFinalAdjustment(
    remainingRoomCents,
    remainingPaychecks,
  );

  const regularPaycheckPercentOfPay =
    grossPaycheckCents > 0
      ? (split.regularCents / grossPaycheckCents) * 100
      : null;

  return {
    ageBand,
    annualLimitCents,
    baseLimitCents,
    catchUpLimitCents,
    annualAdditions415cLimitCents,
    alreadyContributedCents: safeAlready,
    remainingRoomCents,
    regularPaycheckCents: split.regularCents,
    finalPaycheckCents: split.finalCents,
    regularPaycheckPercentOfPay,
  };
}

export interface ScheduleComputation {
  readonly status: ProjectionStatus;
  readonly regularPaycheckCents: number;
  readonly finalPaycheckCents: number;
  readonly uncappedProjectedAnnualEmployeeCents: number;
  readonly cappedProjectedAnnualEmployeeCents: number;
  readonly shortfallCents: number;
  readonly excessCents: number;
  readonly overPriorEmployerLimitCents: number;
  readonly schedule: readonly PaycheckScheduleRow[];
}

export function computeScheduleAndProjection(params: {
  readonly mode: CalcMode;
  readonly target: TargetBreakdown;
  readonly remainingPaychecks: number;
  readonly grossPaycheckCents: number;
  readonly contributionUnit: ContributionUnit;
  readonly contributionValue: number | null;
  readonly rothPercent: number;
  readonly priorYearFicaOver155k: boolean | null;
  readonly matchRatePercent: number | null;
  readonly matchCapPercent: number | null;
}): ScheduleComputation {
  const {
    mode,
    target,
    remainingPaychecks,
    grossPaycheckCents,
    contributionUnit,
    contributionValue,
    rothPercent,
    priorYearFicaOver155k,
    matchRatePercent,
    matchCapPercent,
  } = params;

  const safeRemaining = Math.max(0, Math.floor(remainingPaychecks));
  const alreadyCents = target.alreadyContributedCents;
  const annualLimitCents = target.annualLimitCents;
  const overPriorEmployerLimitCents = Math.max(0, alreadyCents - annualLimitCents);

  if (safeRemaining === 0) {
    const status: ProjectionStatus =
      alreadyCents >= annualLimitCents ? 'already_maxed' : 'no_paychecks_left';
    return {
      status,
      regularPaycheckCents: 0,
      finalPaycheckCents: 0,
      uncappedProjectedAnnualEmployeeCents: alreadyCents,
      cappedProjectedAnnualEmployeeCents: Math.min(alreadyCents, annualLimitCents),
      shortfallCents: Math.max(0, annualLimitCents - alreadyCents),
      excessCents: Math.max(0, alreadyCents - annualLimitCents),
      overPriorEmployerLimitCents,
      schedule: [],
    };
  }

  if (target.remainingRoomCents === 0 && mode === 'maxout') {
    const emptySchedule: PaycheckScheduleRow[] = [];
    for (let i = 1; i <= safeRemaining; i++) {
      emptySchedule.push({
        paycheckNumber: i,
        employeeCents: 0,
        preTaxCents: 0,
        rothCents: 0,
        employerMatchCents: 0,
        cumulativeEmployeeCents: alreadyCents,
        isAdjustedFinal: false,
        isCappedOut: true,
      });
    }
    return {
      status: 'already_maxed',
      regularPaycheckCents: 0,
      finalPaycheckCents: 0,
      uncappedProjectedAnnualEmployeeCents: alreadyCents,
      cappedProjectedAnnualEmployeeCents: Math.min(alreadyCents, annualLimitCents),
      shortfallCents: 0,
      excessCents: overPriorEmployerLimitCents,
      overPriorEmployerLimitCents,
      schedule: emptySchedule,
    };
  }

  const desiredPerPaycheckCents =
    mode === 'maxout'
      ? target.regularPaycheckCents
      : contributionValue === null || contributionValue <= 0
        ? 0
        : contributionUnit === 'percent'
          ? percentOfCents(grossPaycheckCents, contributionValue)
          : toCents(contributionValue);

  const uncappedProjectedAnnualEmployeeCents =
    mode === 'maxout'
      ? alreadyCents + target.remainingRoomCents
      : alreadyCents + desiredPerPaycheckCents * safeRemaining;

  const schedule: PaycheckScheduleRow[] = [];
  let cumulative = alreadyCents;
  let remainingRoom = target.remainingRoomCents;

  for (let i = 1; i <= safeRemaining; i++) {
    const isLast = i === safeRemaining;
    const rawPlanned =
      mode === 'maxout'
        ? isLast
          ? target.finalPaycheckCents
          : target.regularPaycheckCents
        : desiredPerPaycheckCents;

    const actual = Math.min(rawPlanned, remainingRoom);
    const isCappedOut = mode === 'check' && actual < rawPlanned;
    const isAdjustedFinal =
      mode === 'maxout' &&
      isLast &&
      safeRemaining > 1 &&
      target.finalPaycheckCents !== target.regularPaycheckCents;

    const split = computeRothSplit({
      futureEmployeeCents: actual,
      alreadyContributedCents: cumulative,
      baseLimitCents: target.baseLimitCents,
      ageBand: target.ageBand,
      userRothPercent: rothPercent,
      priorYearFicaOver155k,
    });

    const matchCents = computeEmployerMatchForPaycheck({
      employeePaycheckCents: actual,
      grossPaycheckCents,
      matchRatePercent,
      matchCapPercent,
    });

    cumulative += actual;
    remainingRoom -= actual;

    schedule.push({
      paycheckNumber: i,
      employeeCents: actual,
      preTaxCents: split.preTaxCents,
      rothCents: split.rothCents,
      employerMatchCents: matchCents,
      cumulativeEmployeeCents: cumulative,
      isAdjustedFinal,
      isCappedOut,
    });
  }

  const cappedProjectedAnnualEmployeeCents = Math.min(cumulative, annualLimitCents);
  const shortfallCents = Math.max(
    0,
    annualLimitCents - uncappedProjectedAnnualEmployeeCents,
  );
  const excessCents = Math.max(
    0,
    uncappedProjectedAnnualEmployeeCents - annualLimitCents,
  );

  let status: ProjectionStatus = 'exact_max';
  if (excessCents > 0) {
    status = 'over_limit';
  } else if (shortfallCents > 0) {
    status = 'under_limit';
  }

  const regularPaycheckCents =
    mode === 'maxout' ? target.regularPaycheckCents : desiredPerPaycheckCents;
  const finalPaycheckCents =
    mode === 'maxout'
      ? target.finalPaycheckCents
      : (schedule[schedule.length - 1]?.employeeCents ?? 0);

  return {
    status,
    regularPaycheckCents,
    finalPaycheckCents,
    uncappedProjectedAnnualEmployeeCents,
    cappedProjectedAnnualEmployeeCents,
    shortfallCents,
    excessCents,
    overPriorEmployerLimitCents,
    schedule,
  };
}
