import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { LIMITS } from '../../src/config/limits';
import { calculate } from '../../src/engine/calculate';
import type { CalculatorInputs } from '../../src/engine/types';

const LIMITS_2027 = LIMITS[2027];

const inputsArb: fc.Arbitrary<CalculatorInputs> = fc.record({
  grossSalaryDollars: fc.option(fc.integer({ min: 10_000, max: 1_000_000 }), { nil: null }),
  payFrequency: fc.constantFrom('weekly', 'biweekly', 'semimonthly', 'monthly'),
  hasExtraPaycheck: fc.boolean(),
  remainingPaychecks: fc.integer({ min: 0, max: 53 }),
  ageBand: fc.constantFrom('under50', '50to59or64plus', '60to63'),
  mode: fc.constantFrom('maxout', 'check'),
  contributionUnit: fc.constantFrom('percent', 'dollars'),
  contributionValue: fc.option(fc.integer({ min: 0, max: 5_000 }), { nil: null }),
  rothPercent: fc.integer({ min: 0, max: 100 }),
  priorYearFicaOver155k: fc.option(fc.boolean(), { nil: null }),
  ytdCurrentEmployerDollars: fc.integer({ min: 0, max: 40_000 }),
  priorEmployerDollars: fc.integer({ min: 0, max: 40_000 }),
  employerMatchRatePercent: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
  employerMatchCapPercent: fc.option(fc.integer({ min: 0, max: 15 }), { nil: null }),
  trueUp: fc.constantFrom('yes', 'no', 'unsure'),
  federalMarginalRatePercent: fc.option(fc.integer({ min: 0, max: 37 }), { nil: null }),
  stateMarginalRatePercent: fc.option(fc.integer({ min: 0, max: 13 }), { nil: null }),
});

describe('engine invariants (fast-check)', () => {
  it('holds all mathematical and regulatory invariants across arbitrary inputs', () => {
    fc.assert(
      fc.property(inputsArb, (inputs) => {
        const result = calculate(inputs, LIMITS_2027);
        const target = result.target!;

        // 1. Projected capped total never exceeds the applicable limit
        expect(result.cappedProjectedAnnualEmployeeCents).toBeLessThanOrEqual(
          target.annualLimitCents,
        );

        // 2. Pre-tax + Roth always equals total future employee contributions
        const totalFuture = result.schedule.reduce((s, r) => s + r.employeeCents, 0);
        expect(result.rothSplit.preTaxCents + result.rothSplit.rothCents).toBe(
          totalFuture,
        );

        // 3. Forced-Roth rule: if 2026 FICA > $155k and 50+, Roth >= forced catch-up
        if (inputs.priorYearFicaOver155k === true && inputs.ageBand !== 'under50') {
          expect(result.rothSplit.mandatoryRothRuleApplies).toBe(true);
          expect(result.rothSplit.rothCents).toBeGreaterThanOrEqual(
            result.rothSplit.forcedRothCatchUpCents,
          );
        }

        // 4. Amount needed / paycheck amounts never negative or NaN
        expect(result.regularPaycheckCents).toBeGreaterThanOrEqual(0);
        expect(result.finalPaycheckCents).toBeGreaterThanOrEqual(0);
        expect(target.remainingRoomCents).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(result.regularPaycheckCents)).toBe(true);
        expect(Number.isFinite(result.finalPaycheckCents)).toBe(true);

        // 5. Schedule length matches clamped remaining paychecks
        expect(result.schedule).toHaveLength(result.remainingPaychecks);
      }),
      { numRuns: 300 },
    );
  });
});
