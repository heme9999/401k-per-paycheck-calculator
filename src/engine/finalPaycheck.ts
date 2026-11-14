export interface EvenSplitResult {
  readonly regularCents: number;
  readonly finalCents: number;
  readonly regularCount: number;
  readonly finalCount: number;
}

/**
 * Splits `totalNeededCents` across `remainingPaychecks` by rounding the
 * regular paycheck DOWN to the integer cent and placing the exact remainder
 * on the final paycheck so the sum never exceeds the annual limit.
 */
export function splitEvenlyWithFinalAdjustment(
  totalNeededCents: number,
  remainingPaychecks: number,
): EvenSplitResult {
  const safePaychecks = Math.max(0, Math.floor(remainingPaychecks));
  const safeTotal = Math.max(0, Math.round(totalNeededCents));

  if (safePaychecks === 0 || safeTotal === 0) {
    return {
      regularCents: 0,
      finalCents: 0,
      regularCount: 0,
      finalCount: 0,
    };
  }

  if (safePaychecks === 1) {
    return {
      regularCents: safeTotal,
      finalCents: safeTotal,
      regularCount: 0,
      finalCount: 1,
    };
  }

  const regularCents = Math.floor(safeTotal / safePaychecks);
  const remainderCents = safeTotal - regularCents * safePaychecks;
  const finalCents = regularCents + remainderCents;

  return {
    regularCents,
    finalCents,
    regularCount: safePaychecks - 1,
    finalCount: 1,
  };
}
