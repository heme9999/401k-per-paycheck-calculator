import type {
  AgeBand,
  CalcMode,
  CalculatorInputs,
  ContributionUnit,
  PayFrequency,
  TrueUpStatus,
} from '../engine/types';

/**
 * Opt-in shareable link using URL #fragment.
 * Salary and contribution dollar amounts are excluded by default unless
 * the user explicitly ticks `includeSalary`.
 */
export function encodeShareFragment(
  inputs: CalculatorInputs,
  includeSalary: boolean,
): string {
  const params = new URLSearchParams();
  params.set('freq', inputs.payFrequency);
  if (inputs.hasExtraPaycheck) params.set('extra', '1');
  params.set('rem', String(inputs.remainingPaychecks));
  if (inputs.ageBand) params.set('age', inputs.ageBand);
  params.set('mode', inputs.mode);
  params.set('roth', String(inputs.rothPercent));
  if (inputs.priorYearFicaOver155k !== null) {
    params.set('fica155', inputs.priorYearFicaOver155k ? '1' : '0');
  }
  if (inputs.ytdCurrentEmployerDollars > 0) {
    params.set('ytd', String(inputs.ytdCurrentEmployerDollars));
  }
  if (inputs.priorEmployerDollars > 0) {
    params.set('prior', String(inputs.priorEmployerDollars));
  }
  if (inputs.trueUp !== 'unsure') {
    params.set('trueup', inputs.trueUp);
  }
  if (inputs.mode === 'check' && inputs.contributionValue !== null) {
    if (inputs.contributionUnit === 'percent') {
      params.set('unit', 'percent');
      params.set('val', String(inputs.contributionValue));
    } else if (includeSalary) {
      params.set('unit', 'dollars');
      params.set('val', String(inputs.contributionValue));
    }
  }
  if (includeSalary && inputs.grossSalaryDollars !== null) {
    params.set('sal', String(inputs.grossSalaryDollars));
  }
  return `#${params.toString()}`;
}

export function decodeShareFragment(
  hash: string,
): Partial<CalculatorInputs> | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw || !raw.includes('=')) return null;

  const params = new URLSearchParams(raw);
  const out: Partial<CalculatorInputs> = {};

  const freq = params.get('freq');
  if (
    freq === 'weekly' ||
    freq === 'biweekly' ||
    freq === 'semimonthly' ||
    freq === 'monthly'
  ) {
    (out as { payFrequency: PayFrequency }).payFrequency = freq;
  }

  if (params.get('extra') === '1') {
    (out as { hasExtraPaycheck: boolean }).hasExtraPaycheck = true;
  }

  const rem = Number(params.get('rem'));
  if (Number.isInteger(rem) && rem >= 0 && rem <= 53) {
    (out as { remainingPaychecks: number }).remainingPaychecks = rem;
  }

  const age = params.get('age');
  if (age === 'under50' || age === '50to59or64plus' || age === '60to63') {
    (out as { ageBand: AgeBand }).ageBand = age;
  }

  const mode = params.get('mode');
  if (mode === 'maxout' || mode === 'check') {
    (out as { mode: CalcMode }).mode = mode;
  }

  const unit = params.get('unit');
  if (unit === 'percent' || unit === 'dollars') {
    (out as { contributionUnit: ContributionUnit }).contributionUnit = unit;
  }

  const val = Number(params.get('val'));
  if (params.has('val') && Number.isFinite(val) && val >= 0) {
    (out as { contributionValue: number }).contributionValue = val;
  }

  const roth = Number(params.get('roth'));
  if (params.has('roth') && Number.isFinite(roth) && roth >= 0 && roth <= 100) {
    (out as { rothPercent: number }).rothPercent = roth;
  }

  const fica = params.get('fica155');
  if (fica === '1') {
    (out as { priorYearFicaOver155k: boolean }).priorYearFicaOver155k = true;
  } else if (fica === '0') {
    (out as { priorYearFicaOver155k: boolean }).priorYearFicaOver155k = false;
  }

  const ytd = Number(params.get('ytd'));
  if (params.has('ytd') && Number.isFinite(ytd) && ytd >= 0) {
    (out as { ytdCurrentEmployerDollars: number }).ytdCurrentEmployerDollars = ytd;
  }

  const prior = Number(params.get('prior'));
  if (params.has('prior') && Number.isFinite(prior) && prior >= 0) {
    (out as { priorEmployerDollars: number }).priorEmployerDollars = prior;
  }

  const trueUp = params.get('trueup');
  if (trueUp === 'yes' || trueUp === 'no' || trueUp === 'unsure') {
    (out as { trueUp: TrueUpStatus }).trueUp = trueUp;
  }

  const sal = Number(params.get('sal'));
  if (params.has('sal') && Number.isFinite(sal) && sal > 0) {
    (out as { grossSalaryDollars: number }).grossSalaryDollars = sal;
  }

  return out;
}
