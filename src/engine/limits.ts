import type { YearLimits } from '../config/limits';
import type { ResolvedAgeBand } from './types';
import { toCents } from './money';

export const ALL_AGE_BANDS: readonly ResolvedAgeBand[] = [
  'under50',
  '50to59or64plus',
  '60to63',
] as const;

export function getBaseElectiveLimitCents(limits: YearLimits): number {
  return toCents(limits.electiveDeferral);
}

export function getCatchUpPortionCents(
  limits: YearLimits,
  ageBand: ResolvedAgeBand,
): number {
  switch (ageBand) {
    case 'under50':
      return 0;
    case '50to59or64plus':
      return toCents(limits.catchUp50);
    case '60to63':
      return toCents(limits.catchUp60to63);
  }
}

export function getApplicableLimitCents(
  limits: YearLimits,
  ageBand: ResolvedAgeBand,
): number {
  return getBaseElectiveLimitCents(limits) + getCatchUpPortionCents(limits, ageBand);
}

export function getAnnualAdditions415cLimitCents(
  limits: YearLimits,
  ageBand: ResolvedAgeBand,
): number {
  return toCents(limits.annualAdditions415c) + getCatchUpPortionCents(limits, ageBand);
}
