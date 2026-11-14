import type { YearLimits } from '../config/limits';

export type AgeBand = 'under50' | '50to59or64plus' | '60to63' | null;
export type ResolvedAgeBand = Exclude<AgeBand, null>;

export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
export type CalcMode = 'maxout' | 'check';
export type ContributionUnit = 'percent' | 'dollars';
export type TrueUpStatus = 'yes' | 'no' | 'unsure';

export interface CalculatorInputs {
  readonly grossSalaryDollars: number | null;
  readonly payFrequency: PayFrequency;
  readonly hasExtraPaycheck: boolean; // 27 for biweekly, 53 for weekly
  readonly remainingPaychecks: number;
  readonly ageBand: AgeBand;
  readonly mode: CalcMode;
  readonly contributionUnit: ContributionUnit;
  readonly contributionValue: number | null; // % (0-100) or $ per paycheck
  readonly rothPercent: number; // 0-100
  readonly priorYearFicaOver155k: boolean | null; // null = not specified / not applicable
  readonly ytdCurrentEmployerDollars: number;
  readonly priorEmployerDollars: number;
  readonly employerMatchRatePercent: number | null; // e.g., 100 means 100% match
  readonly employerMatchCapPercent: number | null; // e.g., 5 means up to 5% of pay
  readonly trueUp: TrueUpStatus;
  readonly federalMarginalRatePercent: number | null;
  readonly stateMarginalRatePercent: number | null;
}

export interface PaycheckScheduleRow {
  readonly paycheckNumber: number; // 1..remainingPaychecks
  readonly employeeCents: number;
  readonly preTaxCents: number;
  readonly rothCents: number;
  readonly employerMatchCents: number;
  readonly cumulativeEmployeeCents: number; // includes YTD + prior employer
  readonly isAdjustedFinal: boolean;
  readonly isCappedOut: boolean;
}

export interface TargetBreakdown {
  readonly ageBand: ResolvedAgeBand;
  readonly annualLimitCents: number;
  readonly baseLimitCents: number;
  readonly catchUpLimitCents: number;
  readonly annualAdditions415cLimitCents: number;
  readonly alreadyContributedCents: number; // ytdCurrent + priorEmployer
  readonly remainingRoomCents: number;
  readonly regularPaycheckCents: number;
  readonly finalPaycheckCents: number;
  readonly regularPaycheckPercentOfPay: number | null;
}

export interface RothSplitResult {
  readonly preTaxCents: number;
  readonly rothCents: number;
  readonly forcedRothCatchUpCents: number;
  readonly mandatoryRothRuleApplies: boolean;
}

export interface MatchResult {
  readonly totalEmployerMatchCents: number;
  readonly perPaycheckMaxMatchCents: number;
  readonly fullYearPotentialMatchCents: number;
  readonly matchLostWithoutTrueUpCents: number;
  readonly trueUp: TrueUpStatus;
  readonly hasMatchInputs: boolean;
}

export interface TakeHomeResult {
  readonly hasTaxRates: boolean;
  readonly combinedMarginalRatePercent: number;
  readonly regularPaycheckReductionCents: number;
  readonly regularTaxSavingsEstimateCents: number;
  readonly regularPreTaxCents: number;
  readonly regularRothCents: number;
}

export type ProjectionStatus =
  | 'exact_max'
  | 'under_limit'
  | 'over_limit'
  | 'already_maxed'
  | 'no_paychecks_left';

export interface CalculationResult {
  readonly limits: YearLimits;
  readonly totalPayPeriodsInYear: number;
  readonly remainingPaychecks: number;
  readonly selectedAgeBand: AgeBand;
  readonly target: TargetBreakdown | null;
  readonly allTargets: readonly TargetBreakdown[];
  readonly status: ProjectionStatus;
  readonly regularPaycheckCents: number;
  readonly finalPaycheckCents: number;
  readonly regularPaycheckPercentOfPay: number | null;
  readonly uncappedProjectedAnnualEmployeeCents: number;
  readonly cappedProjectedAnnualEmployeeCents: number;
  readonly shortfallCents: number;
  readonly excessCents: number;
  readonly overPriorEmployerLimitCents: number;
  readonly rothSplit: RothSplitResult;
  readonly match: MatchResult;
  readonly takeHome: TakeHomeResult;
  readonly schedule: readonly PaycheckScheduleRow[];
}
