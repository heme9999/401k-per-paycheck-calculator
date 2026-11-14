import { CURRENT_YEAR } from '../config/site';
import {
  countPaydaysInYearFromFirst,
  getStandardPayPeriods,
  supportsExtraPaycheck,
} from '../engine/payPeriods';
import type {
  AgeBand,
  CalcMode,
  CalculatorInputs,
  ContributionUnit,
  PayFrequency,
  TrueUpStatus,
} from '../engine/types';
import { decodeShareFragment } from './shareLink';
import { formatDollarString, parseNumericInput } from './validate';

export function readFormInputs(form: HTMLFormElement): CalculatorInputs {
  const getRadio = (name: string): string | null => {
    const checked = form.querySelector<HTMLInputElement>(
      `input[name="${name}"]:checked`,
    );
    return checked ? checked.value : null;
  };

  const getNum = (id: string): number | null => {
    const el = form.querySelector<HTMLInputElement>(`#${id}`);
    if (!el) return null;
    return parseNumericInput(el.value);
  };

  const payFrequency = (getRadio('pay-frequency') || 'biweekly') as PayFrequency;
  const extraCheckbox = form.querySelector<HTMLInputElement>('#extra-paycheck');
  const hasExtraPaycheck =
    supportsExtraPaycheck(payFrequency) && Boolean(extraCheckbox?.checked);

  const standardPeriods = getStandardPayPeriods(payFrequency, hasExtraPaycheck);
  const remRaw = getNum('remaining-paychecks');
  const remainingPaychecks =
    remRaw !== null && remRaw >= 0
      ? Math.min(Math.floor(remRaw), standardPeriods)
      : standardPeriods;

  const ageRaw = getRadio('age-band');
  const ageBand: AgeBand =
    ageRaw === 'under50' || ageRaw === '50to59or64plus' || ageRaw === '60to63'
      ? ageRaw
      : null;

  const mode = (getRadio('calc-mode') || 'maxout') as CalcMode;
  const contributionUnit = (getRadio('contrib-unit') ||
    'percent') as ContributionUnit;
  const contributionValue = getNum('contrib-value');

  const rothRaw = getNum('roth-number');
  const rothPercent =
    rothRaw !== null ? Math.min(Math.max(rothRaw, 0), 100) : 0;

  const ficaRaw = getRadio('fica-155k');
  const priorYearFicaOver155k =
    ficaRaw === 'yes' ? true : ficaRaw === 'no' ? false : null;

  const ytdRaw = getNum('ytd-current');
  const priorRaw = getNum('prior-employer');

  const trueUp = (getRadio('true-up') || 'unsure') as TrueUpStatus;

  return {
    grossSalaryDollars: getNum('gross-salary'),
    payFrequency,
    hasExtraPaycheck,
    remainingPaychecks,
    ageBand,
    mode,
    contributionUnit,
    contributionValue,
    rothPercent,
    priorYearFicaOver155k,
    ytdCurrentEmployerDollars: ytdRaw !== null && ytdRaw > 0 ? ytdRaw : 0,
    priorEmployerDollars: priorRaw !== null && priorRaw > 0 ? priorRaw : 0,
    employerMatchRatePercent: getNum('match-rate'),
    employerMatchCapPercent: getNum('match-cap'),
    trueUp,
    federalMarginalRatePercent: getNum('fed-tax-rate'),
    stateMarginalRatePercent: getNum('state-tax-rate'),
  };
}

export function applyFragmentToForm(form: HTMLFormElement, hash: string): void {
  const decoded = decodeShareFragment(hash);
  if (!decoded) return;

  const setRadio = (name: string, value: string): void => {
    const el = form.querySelector<HTMLInputElement>(
      `input[name="${name}"][value="${value}"]`,
    );
    if (el) el.checked = true;
  };

  if (decoded.payFrequency) setRadio('pay-frequency', decoded.payFrequency);
  const extraEl = form.querySelector<HTMLInputElement>('#extra-paycheck');
  if (extraEl && decoded.hasExtraPaycheck !== undefined) {
    extraEl.checked = decoded.hasExtraPaycheck;
  }
  if (decoded.remainingPaychecks !== undefined) {
    const remEl = form.querySelector<HTMLInputElement>('#remaining-paychecks');
    if (remEl) {
      remEl.value = String(decoded.remainingPaychecks);
      remEl.dataset.userEdited = 'true';
    }
  }
  if (decoded.ageBand) setRadio('age-band', decoded.ageBand);
  if (decoded.mode) setRadio('calc-mode', decoded.mode);
  if (decoded.contributionUnit) setRadio('contrib-unit', decoded.contributionUnit);

  if (decoded.contributionValue !== undefined) {
    const valEl = form.querySelector<HTMLInputElement>('#contrib-value');
    if (valEl) valEl.value = String(decoded.contributionValue);
  }
  if (decoded.rothPercent !== undefined) {
    const rRange = form.querySelector<HTMLInputElement>('#roth-range');
    const rNum = form.querySelector<HTMLInputElement>('#roth-number');
    if (rRange) rRange.value = String(decoded.rothPercent);
    if (rNum) rNum.value = String(decoded.rothPercent);
  }
  if (decoded.priorYearFicaOver155k !== undefined) {
    setRadio('fica-155k', decoded.priorYearFicaOver155k ? 'yes' : 'no');
  }
  if (decoded.ytdCurrentEmployerDollars !== undefined) {
    const ytdEl = form.querySelector<HTMLInputElement>('#ytd-current');
    if (ytdEl) ytdEl.value = formatDollarString(decoded.ytdCurrentEmployerDollars);
  }
  if (decoded.priorEmployerDollars !== undefined) {
    const pEl = form.querySelector<HTMLInputElement>('#prior-employer');
    if (pEl) pEl.value = formatDollarString(decoded.priorEmployerDollars);
  }
  if (decoded.trueUp) setRadio('true-up', decoded.trueUp);
  if (decoded.grossSalaryDollars !== undefined && decoded.grossSalaryDollars !== null) {
    const salEl = form.querySelector<HTMLInputElement>('#gross-salary');
    if (salEl) salEl.value = formatDollarString(decoded.grossSalaryDollars);
  }
}

export function syncConditionalControls(form: HTMLFormElement): void {
  const freqEl = form.querySelector<HTMLInputElement>(
    'input[name="pay-frequency"]:checked',
  );
  const freq = (freqEl?.value || 'biweekly') as PayFrequency;
  const extraWrap = form.querySelector<HTMLElement>('#extra-paycheck-wrap');
  const extraCheckbox = form.querySelector<HTMLInputElement>('#extra-paycheck');
  const extraLabel = form.querySelector<HTMLElement>('#extra-paycheck-label');
  const remInput = form.querySelector<HTMLInputElement>('#remaining-paychecks');

  const supportsExtra = supportsExtraPaycheck(freq);
  if (extraWrap) extraWrap.hidden = !supportsExtra;
  if (extraLabel) {
    extraLabel.textContent =
      freq === 'weekly'
        ? `53 paychecks in ${CURRENT_YEAR} (first payday Jan 1, ${CURRENT_YEAR})`
        : `27 paychecks in ${CURRENT_YEAR} (first payday Jan 1, ${CURRENT_YEAR})`;
  }

  const totalPeriods = getStandardPayPeriods(
    freq,
    supportsExtra && Boolean(extraCheckbox?.checked),
  );
  if (remInput) {
    remInput.max = String(totalPeriods);
    if (remInput.dataset.userEdited !== 'true') {
      remInput.value = String(totalPeriods);
    }
  }

  // First payday date helper
  const firstPaydayEl = form.querySelector<HTMLInputElement>('#first-payday');
  const firstPaydayHint = form.querySelector<HTMLElement>('#first-payday-hint');
  if (firstPaydayEl && firstPaydayHint && supportsExtra) {
    if (firstPaydayEl.value) {
      const count = countPaydaysInYearFromFirst(
        firstPaydayEl.value,
        freq === 'weekly' ? 'weekly' : 'biweekly',
        CURRENT_YEAR,
      );
      if (count !== null) {
        firstPaydayHint.textContent = `Counts ${count} paydays in ${CURRENT_YEAR}.`;
      } else {
        firstPaydayHint.textContent = `Enter a ${CURRENT_YEAR} date to check 26 vs 27 (or 52 vs 53) paydays.`;
      }
    } else {
      firstPaydayHint.textContent = `Jan 1, ${CURRENT_YEAR} is a Friday (holiday). Confirm your first actual payday.`;
    }
  }

  // Mode toggle
  const mode =
    form.querySelector<HTMLInputElement>('input[name="calc-mode"]:checked')
      ?.value || 'maxout';
  const checkGroup = form.querySelector<HTMLElement>('#check-current-group');
  if (checkGroup) checkGroup.hidden = mode !== 'check';

  // Contribution unit toggle
  const unit =
    form.querySelector<HTMLInputElement>('input[name="contrib-unit"]:checked')
      ?.value || 'percent';
  const prefixEl = form.querySelector<HTMLElement>('#contrib-affix-prefix');
  const suffixEl = form.querySelector<HTMLElement>('#contrib-affix-suffix');
  const contribWrap = form.querySelector<HTMLElement>('#contrib-value-wrap');
  if (prefixEl && suffixEl && contribWrap) {
    const isDollars = unit === 'dollars';
    prefixEl.hidden = !isDollars;
    suffixEl.hidden = isDollars;
    contribWrap.classList.toggle('has-prefix', isDollars);
    contribWrap.classList.toggle('has-suffix', !isDollars);
  }
}
