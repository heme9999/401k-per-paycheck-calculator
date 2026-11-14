import type { TakeHomeResult } from './types';

/**
 * Estimates per-paycheck take-home pay reduction using ONLY user-entered
 * federal and state marginal income tax rates.
 *
 * IMPORTANT: Pre-tax 401(k) deferrals do NOT reduce Social Security or
 * Medicare (FICA) taxes. Never include FICA savings here.
 */
export function computeTakeHomeEstimate(params: {
  readonly regularPreTaxCents: number;
  readonly regularRothCents: number;
  readonly federalMarginalRatePercent: number | null;
  readonly stateMarginalRatePercent: number | null;
}): TakeHomeResult {
  const fed =
    params.federalMarginalRatePercent !== null &&
    Number.isFinite(params.federalMarginalRatePercent)
      ? Math.min(Math.max(params.federalMarginalRatePercent, 0), 50)
      : null;
  const state =
    params.stateMarginalRatePercent !== null &&
    Number.isFinite(params.stateMarginalRatePercent)
      ? Math.min(Math.max(params.stateMarginalRatePercent, 0), 20)
      : null;

  const hasTaxRates = fed !== null || state !== null;
  const combinedRate = (fed ?? 0) + (state ?? 0);

  const regularPreTaxCents = Math.max(0, Math.round(params.regularPreTaxCents));
  const regularRothCents = Math.max(0, Math.round(params.regularRothCents));
  const totalContrib = regularPreTaxCents + regularRothCents;

  if (!hasTaxRates) {
    return {
      hasTaxRates: false,
      combinedMarginalRatePercent: 0,
      regularPaycheckReductionCents: totalContrib,
      regularTaxSavingsEstimateCents: 0,
      regularPreTaxCents,
      regularRothCents,
    };
  }

  const taxSavings = Math.round((regularPreTaxCents * combinedRate) / 100);
  const reduction = Math.max(0, totalContrib - taxSavings);

  return {
    hasTaxRates: true,
    combinedMarginalRatePercent: combinedRate,
    regularPaycheckReductionCents: reduction,
    regularTaxSavingsEstimateCents: taxSavings,
    regularPreTaxCents,
    regularRothCents,
  };
}
