import { describe, expect, it } from 'vitest';
import { LIMITS } from '../../src/config/limits';
import { calculate } from '../../src/engine/calculate';
import { countPaydaysInYearFromFirst } from '../../src/engine/payPeriods';
import type {
  CalculatorInputs,
  PayFrequency,
  ResolvedAgeBand,
} from '../../src/engine/types';

const LIMITS_2027 = LIMITS[2027];

function baseInputs(overrides: Partial<CalculatorInputs> = {}): CalculatorInputs {
  return {
    grossSalaryDollars: 120_000,
    payFrequency: 'biweekly',
    hasExtraPaycheck: false,
    remainingPaychecks: 26,
    ageBand: 'under50',
    mode: 'maxout',
    contributionUnit: 'dollars',
    contributionValue: null,
    rothPercent: 0,
    priorYearFicaOver155k: null,
    ytdCurrentEmployerDollars: 0,
    priorEmployerDollars: 0,
    employerMatchRatePercent: null,
    employerMatchCapPercent: null,
    trueUp: 'unsure',
    federalMarginalRatePercent: null,
    stateMarginalRatePercent: null,
    ...overrides,
  };
}

describe('2027 hand-checked anchor values', () => {
  const anchors: Array<{
    ageBand: ResolvedAgeBand;
    limitDollars: number;
    payFrequency: PayFrequency;
    hasExtraPaycheck: boolean;
    periods: number;
    expectedRegularCents: number;
  }> = [
    // $25,500
    { ageBand: 'under50', limitDollars: 25_500, payFrequency: 'weekly', hasExtraPaycheck: false, periods: 52, expectedRegularCents: 49_038 },
    { ageBand: 'under50', limitDollars: 25_500, payFrequency: 'biweekly', hasExtraPaycheck: false, periods: 26, expectedRegularCents: 98_076 },
    { ageBand: 'under50', limitDollars: 25_500, payFrequency: 'biweekly', hasExtraPaycheck: true, periods: 27, expectedRegularCents: 94_444 },
    { ageBand: 'under50', limitDollars: 25_500, payFrequency: 'semimonthly', hasExtraPaycheck: false, periods: 24, expectedRegularCents: 106_250 },
    { ageBand: 'under50', limitDollars: 25_500, payFrequency: 'monthly', hasExtraPaycheck: false, periods: 12, expectedRegularCents: 212_500 },
    // $34,000
    { ageBand: '50to59or64plus', limitDollars: 34_000, payFrequency: 'weekly', hasExtraPaycheck: false, periods: 52, expectedRegularCents: 65_384 },
    { ageBand: '50to59or64plus', limitDollars: 34_000, payFrequency: 'biweekly', hasExtraPaycheck: false, periods: 26, expectedRegularCents: 130_769 },
    { ageBand: '50to59or64plus', limitDollars: 34_000, payFrequency: 'biweekly', hasExtraPaycheck: true, periods: 27, expectedRegularCents: 125_925 },
    { ageBand: '50to59or64plus', limitDollars: 34_000, payFrequency: 'semimonthly', hasExtraPaycheck: false, periods: 24, expectedRegularCents: 141_666 },
    { ageBand: '50to59or64plus', limitDollars: 34_000, payFrequency: 'monthly', hasExtraPaycheck: false, periods: 12, expectedRegularCents: 283_333 },
    // $37,250
    { ageBand: '60to63', limitDollars: 37_250, payFrequency: 'weekly', hasExtraPaycheck: false, periods: 52, expectedRegularCents: 71_634 },
    { ageBand: '60to63', limitDollars: 37_250, payFrequency: 'biweekly', hasExtraPaycheck: false, periods: 26, expectedRegularCents: 143_269 },
    { ageBand: '60to63', limitDollars: 37_250, payFrequency: 'biweekly', hasExtraPaycheck: true, periods: 27, expectedRegularCents: 137_962 },
    { ageBand: '60to63', limitDollars: 37_250, payFrequency: 'semimonthly', hasExtraPaycheck: false, periods: 24, expectedRegularCents: 155_208 },
    { ageBand: '60to63', limitDollars: 37_250, payFrequency: 'monthly', hasExtraPaycheck: false, periods: 12, expectedRegularCents: 310_416 },
  ];

  it.each(anchors)(
    '$ageBand ($limitDollars) $payFrequency ($periods periods) -> regular $expectedRegularCents cents',
    ({ ageBand, limitDollars, payFrequency, hasExtraPaycheck, periods, expectedRegularCents }) => {
      const result = calculate(
        baseInputs({
          ageBand,
          payFrequency,
          hasExtraPaycheck,
          remainingPaychecks: periods,
        }),
        LIMITS_2027,
      );

      expect(result.regularPaycheckCents).toBe(expectedRegularCents);
      expect(result.cappedProjectedAnnualEmployeeCents).toBe(limitDollars * 100);
      expect(result.schedule).toHaveLength(periods);
      const sum = result.schedule.reduce((acc, r) => acc + r.employeeCents, 0);
      expect(sum).toBe(limitDollars * 100);
    },
  );

  it('biweekly 26 $25,500 uses 25 x $980.76 + final $981.00 = exactly $25,500.00', () => {
    const result = calculate(baseInputs(), LIMITS_2027);
    expect(result.regularPaycheckCents).toBe(98_076);
    expect(result.finalPaycheckCents).toBe(98_100);
    expect(result.schedule[0]?.employeeCents).toBe(98_076);
    expect(result.schedule[25]?.employeeCents).toBe(98_100);
    expect(result.schedule[25]?.isAdjustedFinal).toBe(true);
  });
});

describe('table-driven matrix: frequency x age band x prior-employer x % vs $', () => {
  const frequencies: Array<{ freq: PayFrequency; extra: boolean; periods: number }> = [
    { freq: 'weekly', extra: false, periods: 52 },
    { freq: 'weekly', extra: true, periods: 53 },
    { freq: 'biweekly', extra: false, periods: 26 },
    { freq: 'biweekly', extra: true, periods: 27 },
    { freq: 'semimonthly', extra: false, periods: 24 },
    { freq: 'monthly', extra: false, periods: 12 },
  ];
  const ageBands: ResolvedAgeBand[] = ['under50', '50to59or64plus', '60to63'];
  const priorAmounts = [0, 5_000];
  const units: Array<{ unit: 'percent' | 'dollars'; value: number }> = [
    { unit: 'percent', value: 15 },
    { unit: 'dollars', value: 800 },
  ];

  const cases = frequencies.flatMap((f) =>
    ageBands.flatMap((ageBand) =>
      priorAmounts.flatMap((priorEmployerDollars) =>
        units.map((u) => ({
          ...f,
          ageBand,
          priorEmployerDollars,
          ...u,
        })),
      ),
    ),
  );

  it.each(cases)(
    'check mode: $freq ($periods) $ageBand prior=$$priorEmployerDollars $unit=$value',
    ({ freq, extra, periods, ageBand, priorEmployerDollars, unit, value }) => {
      const result = calculate(
        baseInputs({
          mode: 'check',
          payFrequency: freq,
          hasExtraPaycheck: extra,
          remainingPaychecks: periods,
          ageBand,
          priorEmployerDollars,
          contributionUnit: unit,
          contributionValue: value,
        }),
        LIMITS_2027,
      );

      expect(result.cappedProjectedAnnualEmployeeCents).toBeLessThanOrEqual(
        result.target!.annualLimitCents,
      );
      expect(result.rothSplit.preTaxCents + result.rothSplit.rothCents).toBe(
        result.schedule.reduce((s, r) => s + r.employeeCents, 0),
      );
    },
  );
});

describe('2027 calendar & regulatory rules', () => {
  it('Jan 1, 2027 (Friday) produces 27 biweekly and 53 weekly paydays', () => {
    expect(countPaydaysInYearFromFirst('2027-01-01', 'biweekly', 2027)).toBe(27);
    expect(countPaydaysInYearFromFirst('2027-01-01', 'weekly', 2027)).toBe(53);
    expect(countPaydaysInYearFromFirst('2027-01-08', 'biweekly', 2027)).toBe(26);
    expect(countPaydaysInYearFromFirst('2027-01-08', 'weekly', 2027)).toBe(52);
  });

  it('enforces mandatory Roth catch-up when 2026 FICA wages > $155,000', () => {
    const result = calculate(
      baseInputs({
        ageBand: '60to63',
        rothPercent: 0, // user selected 100% pre-tax
        priorYearFicaOver155k: true,
      }),
      LIMITS_2027,
    );

    expect(result.rothSplit.mandatoryRothRuleApplies).toBe(true);
    expect(result.rothSplit.forcedRothCatchUpCents).toBe(1_175_000); // $11,750
    expect(result.rothSplit.rothCents).toBe(1_175_000);
    expect(result.rothSplit.preTaxCents).toBe(2_550_000); // $25,500
  });

  it('returns all 3 targets side by side when ageBand is unselected', () => {
    const result = calculate(baseInputs({ ageBand: null }), LIMITS_2027);
    expect(result.selectedAgeBand).toBeNull();
    expect(result.target).toBeNull();
    expect(result.allTargets).toHaveLength(3);
    expect(result.allTargets.map((t) => t.annualLimitCents)).toEqual([
      2_550_000,
      3_400_000,
      3_725_000,
    ]);
  });

  it('handles zero remaining paychecks without dividing by zero', () => {
    const result = calculate(
      baseInputs({ remainingPaychecks: 0, ytdCurrentEmployerDollars: 10_000 }),
      LIMITS_2027,
    );
    expect(result.status).toBe('no_paychecks_left');
    expect(result.regularPaycheckCents).toBe(0);
    expect(result.finalPaycheckCents).toBe(0);
    expect(Number.isFinite(result.cappedProjectedAnnualEmployeeCents)).toBe(true);
  });

  it('flags excess when check mode projects over the annual limit', () => {
    const result = calculate(
      baseInputs({
        mode: 'check',
        contributionUnit: 'dollars',
        contributionValue: 1_500, // 26 * $1,500 = $39,000 > $25,500
      }),
      LIMITS_2027,
    );
    expect(result.status).toBe('over_limit');
    expect(result.uncappedProjectedAnnualEmployeeCents).toBe(3_900_000);
    expect(result.cappedProjectedAnnualEmployeeCents).toBe(2_550_000);
    expect(result.excessCents).toBe(1_350_000);
  });

  it('computes match lost when front-loading without true-up', () => {
    const result = calculate(
      baseInputs({
        grossSalaryDollars: 130_000, // $5,000 per biweekly paycheck
        mode: 'check',
        contributionUnit: 'dollars',
        contributionValue: 2_550, // maxes out in 10 paychecks!
        employerMatchRatePercent: 100,
        employerMatchCapPercent: 4, // $200 per paycheck max match
        trueUp: 'no',
      }),
      LIMITS_2027,
    );
    expect(result.match.hasMatchInputs).toBe(true);
    expect(result.match.totalEmployerMatchCents).toBe(10 * 20_000); // $2,000
    expect(result.match.matchLostWithoutTrueUpCents).toBe(16 * 20_000); // $3,200 lost!
  });
});
