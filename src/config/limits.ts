export interface YearLimits {
  readonly year: number;
  readonly electiveDeferral: number;
  readonly catchUp50: number;
  readonly catchUp60to63: number;
  readonly rothCatchUpWageThreshold: number;
  readonly annualAdditions415c: number;
  readonly socialSecurityWageBase: number;
  readonly iraLimit: number;
  readonly priorYearElectiveDeferral: number;
  readonly source: string;
  readonly published: string;
}

export const LIMITS = {
  2027: {
    year: 2027,
    electiveDeferral: 25_500,
    catchUp50: 8_500,
    catchUp60to63: 11_750,
    rothCatchUpWageThreshold: 155_000,
    annualAdditions415c: 75_000,
    socialSecurityWageBase: 192_300,
    iraLimit: 7_500,
    priorYearElectiveDeferral: 24_500,
    source: 'IRS Notice 2026-66 / IR-2026-136',
    published: '2026-11-12',
  },
} as const satisfies Record<number, YearLimits>;

export type SupportedYear = keyof typeof LIMITS;
