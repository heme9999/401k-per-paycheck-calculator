import type { MatchResult, TrueUpStatus } from './types';

/**
 * Computes employer match per paycheck and estimates potential match lost
 * if the employee caps out early without a year-end true-up.
 */
export function computeEmployerMatchForPaycheck(params: {
  readonly employeePaycheckCents: number;
  readonly grossPaycheckCents: number;
  readonly matchRatePercent: number | null;
  readonly matchCapPercent: number | null;
}): number {
  const { employeePaycheckCents, grossPaycheckCents, matchRatePercent, matchCapPercent } =
    params;

  if (
    grossPaycheckCents <= 0 ||
    matchRatePercent === null ||
    matchCapPercent === null ||
    matchRatePercent <= 0 ||
    matchCapPercent <= 0
  ) {
    return 0;
  }

  const maxMatchableEmployeeCents = Math.round(
    (grossPaycheckCents * matchCapPercent) / 100,
  );
  const matchedEmployeeCents = Math.min(
    Math.max(0, employeePaycheckCents),
    maxMatchableEmployeeCents,
  );

  return Math.round((matchedEmployeeCents * matchRatePercent) / 100);
}

export function summarizeEmployerMatch(params: {
  readonly paycheckEmployeeAmountsCents: readonly number[];
  readonly grossPaycheckCents: number;
  readonly matchRatePercent: number | null;
  readonly matchCapPercent: number | null;
  readonly trueUp: TrueUpStatus;
}): MatchResult {
  const {
    paycheckEmployeeAmountsCents,
    grossPaycheckCents,
    matchRatePercent,
    matchCapPercent,
    trueUp,
  } = params;

  const hasMatchInputs =
    grossPaycheckCents > 0 &&
    matchRatePercent !== null &&
    matchCapPercent !== null &&
    matchRatePercent > 0 &&
    matchCapPercent > 0;

  if (!hasMatchInputs) {
    return {
      totalEmployerMatchCents: 0,
      perPaycheckMaxMatchCents: 0,
      fullYearPotentialMatchCents: 0,
      matchLostWithoutTrueUpCents: 0,
      trueUp,
      hasMatchInputs: false,
    };
  }

  const maxMatchablePerPaycheck = Math.round(
    (grossPaycheckCents * matchCapPercent) / 100,
  );
  const perPaycheckMaxMatchCents = Math.round(
    (maxMatchablePerPaycheck * matchRatePercent) / 100,
  );

  let perPaycheckTotalMatchCents = 0;
  let totalEmployeeFutureCents = 0;

  for (const empCents of paycheckEmployeeAmountsCents) {
    totalEmployeeFutureCents += empCents;
    perPaycheckTotalMatchCents += computeEmployerMatchForPaycheck({
      employeePaycheckCents: empCents,
      grossPaycheckCents,
      matchRatePercent,
      matchCapPercent,
    });
  }

  const remainingCount = paycheckEmployeeAmountsCents.length;
  const fullYearPotentialMatchCents = Math.min(
    perPaycheckMaxMatchCents * remainingCount,
    Math.round((totalEmployeeFutureCents * matchRatePercent) / 100),
  );

  const matchLostWithoutTrueUpCents =
    trueUp === 'yes'
      ? 0
      : Math.max(0, fullYearPotentialMatchCents - perPaycheckTotalMatchCents);

  const totalEmployerMatchCents =
    trueUp === 'yes'
      ? Math.max(perPaycheckTotalMatchCents, fullYearPotentialMatchCents)
      : perPaycheckTotalMatchCents;

  return {
    totalEmployerMatchCents,
    perPaycheckMaxMatchCents,
    fullYearPotentialMatchCents,
    matchLostWithoutTrueUpCents,
    trueUp,
    hasMatchInputs: true,
  };
}
