import { formatCents, formatPercent } from '../engine/money';
import type { CalculationResult, ResolvedAgeBand } from '../engine/types';

const AGE_BAND_LABELS: Record<ResolvedAgeBand, string> = {
  under50: 'Under 50',
  '50to59or64plus': '50–59 or 64+',
  '60to63': 'Ages 60–63',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderResults(
  result: CalculationResult,
  container: HTMLElement,
  mobileSticky: { amountEl: HTMLElement | null; subEl: HTMLElement | null },
  grossSalaryDollars: number | null = null,
): void {
  const { limits } = result;
  const ageSelected = result.selectedAgeBand !== null;
  const target = result.target ?? result.allTargets[0]!;

  // Mobile sticky bar headline
  if (mobileSticky.amountEl && mobileSticky.subEl) {
    if (!ageSelected) {
      mobileSticky.amountEl.textContent = 'Select age';
      mobileSticky.subEl.textContent = '2027 limits: $25,500 / $34,000 / $37,250';
    } else {
      mobileSticky.amountEl.textContent = `Per paycheck ${formatCents(result.regularPaycheckCents)}`;
      mobileSticky.subEl.textContent = `Limit ${formatCents(target.annualLimitCents, { showZeroCents: false })} (${AGE_BAND_LABELS[result.selectedAgeBand!]})`;
    }
  }

  // When age band is NOT selected yet: show 3 clickable target cards + placeholder + empty progress bar
  if (!ageSelected) {
    const cards = result.allTargets
      .map((t) => {
        const pct =
          t.regularPaycheckPercentOfPay !== null
            ? ` · ${formatPercent(t.regularPaycheckPercentOfPay, 1)} of pay`
            : '';
        return `
        <button type="button" class="target-box" data-select-age="${t.ageBand}">
          <div class="target-box-age">${AGE_BAND_LABELS[t.ageBand]}</div>
          <div class="target-box-amount">${formatCents(t.regularPaycheckCents)}</div>
          <div class="target-box-limit">Limit: ${formatCents(t.annualLimitCents, { showZeroCents: false })}${pct}</div>
          <span class="target-box-cta">Select →</span>
        </button>`;
      })
      .join('');

    container.innerHTML = `
      <h2 class="results-section-heading">Your 2027 Per-Paycheck Plan</h2>
      <div class="result-headline-label">2027 Max-Out Targets by Age (Click a card to lock in)</div>
      <div class="targets-compare">${cards}</div>
      <div class="status-banner status-banner-info">
        <span aria-hidden="true">i</span>
        <div>Select your age band above (or click one of the three target cards) to lock in your per-paycheck plan, final paycheck adjustment, and progress tracker.</div>
      </div>
      <div class="progress-wrap">
        <div class="progress-labels">
          <span>So far: ${formatCents(target.alreadyContributedCents, { showZeroCents: false })}</span>
          <span>Select an age band to project</span>
        </div>
        <div class="progress-track" role="img" aria-label="No age band selected yet">
          <div class="progress-ytd" style="width: 0%"></div>
          <div class="progress-projected" style="width: 0%"></div>
        </div>
      </div>
    `;
    return;
  }

  const headlineAmount = formatCents(result.regularPaycheckCents);
  const hasAdjustedFinal =
    result.remainingPaychecks > 1 &&
    result.finalPaycheckCents !== result.regularPaycheckCents;

  const salaryShareLine =
    grossSalaryDollars !== null &&
    grossSalaryDollars > 0 &&
    result.regularPaycheckPercentOfPay !== null
      ? `<p class="result-subline" style="margin-bottom: 0.5rem;"><strong>Equals ~${formatPercent(result.regularPaycheckPercentOfPay, 1)}</strong> of your $${grossSalaryDollars.toLocaleString('en-US')} gross salary.${!result.match.hasMatchInputs ? ' <span style="color: var(--muted);">Add employer match in Section D below to see free employer money.</span>' : ''}</p>`
      : '';

  const finalNote = hasAdjustedFinal
    ? `<span class="result-final-accent">Final paycheck adjusted to ${formatCents(result.finalPaycheckCents)}</span> so the year totals exact ${formatCents(result.cappedProjectedAnnualEmployeeCents)} (never over the limit).`
    : result.remainingPaychecks > 0
      ? `Across ${result.remainingPaychecks} remaining paycheck${result.remainingPaychecks === 1 ? '' : 's'}.`
      : 'No remaining paychecks entered for 2027.';

  // 2. Status banner (icon + text, never color alone)
  let statusBanner = '';
  if (result.status === 'already_maxed') {
    statusBanner = `
      <div class="status-banner status-banner-ok">
        <span aria-hidden="true">✓</span>
        <div>
          <strong>Already maxed out:</strong> Your year-to-date and prior-employer contributions (${formatCents(target.alreadyContributedCents)}) already reach or exceed the ${formatCents(target.annualLimitCents, { showZeroCents: false })} limit.
          ${result.overPriorEmployerLimitCents > 0 ? ` Excess over limit: <strong>${formatCents(result.overPriorEmployerLimitCents)}</strong> — contact your plan administrator for a corrective distribution.` : ''}
        </div>
      </div>`;
  } else if (result.status === 'no_paychecks_left') {
    statusBanner = `
      <div class="status-banner status-banner-warn">
        <span aria-hidden="true">!</span>
        <div><strong>No paychecks left:</strong> With 0 remaining paychecks, your 2027 total stays at ${formatCents(target.alreadyContributedCents)} (${formatCents(result.shortfallCents)} below the ${formatCents(target.annualLimitCents, { showZeroCents: false })} limit).</div>
      </div>`;
  } else if (result.status === 'over_limit') {
    statusBanner = `
      <div class="status-banner status-banner-warn">
        <span aria-hidden="true">⚠</span>
        <div>
          <strong>Exceeds 2027 limit by ${formatCents(result.excessCents)}:</strong> Uncapped pace projects <strong>${formatCents(result.uncappedProjectedAnnualEmployeeCents)}</strong>, which is above your ${formatCents(target.annualLimitCents, { showZeroCents: false })} limit. Most payroll systems cap deferrals at ${formatCents(result.cappedProjectedAnnualEmployeeCents)}, which may stop contributions early.
        </div>
      </div>`;
  } else if (result.status === 'under_limit') {
    statusBanner = `
      <div class="status-banner status-banner-info">
        <span aria-hidden="true">i</span>
        <div>
          <strong>Projected ${formatCents(result.uncappedProjectedAnnualEmployeeCents)}:</strong> ${formatCents(result.shortfallCents)} below the ${formatCents(target.annualLimitCents, { showZeroCents: false })} limit.
        </div>
      </div>`;
  } else {
    statusBanner = `
      <div class="status-banner status-banner-ok">
        <span aria-hidden="true">✓</span>
        <div>
          <strong>On track for exact ${formatCents(target.annualLimitCents, { showZeroCents: false })} max:</strong> ${formatCents(target.remainingRoomCents)} remaining across ${result.remainingPaychecks} paycheck${result.remainingPaychecks === 1 ? '' : 's'}.
        </div>
      </div>`;
  }

  // 3. Progress bar (so-far / projected / limit with catch-up marker)
  const limitCents = target.annualLimitCents;
  const ytdPct = Math.min(100, (target.alreadyContributedCents / limitCents) * 100);
  const futureCents = Math.max(
    0,
    result.cappedProjectedAnnualEmployeeCents - target.alreadyContributedCents,
  );
  const futurePct = Math.min(100 - ytdPct, (futureCents / limitCents) * 100);
  const catchUpMarkerPct =
    target.catchUpLimitCents > 0
      ? (target.baseLimitCents / limitCents) * 100
      : null;

  const progressHtml = `
    <div class="progress-wrap">
      <div class="progress-labels">
        <span>So far: ${formatCents(target.alreadyContributedCents, { showZeroCents: false })}</span>
        <span>Projected: ${formatCents(result.cappedProjectedAnnualEmployeeCents, { showZeroCents: false })} / ${formatCents(limitCents, { showZeroCents: false })}</span>
      </div>
      <div class="progress-track" role="img" aria-label="Progress toward ${formatCents(limitCents, { showZeroCents: false })} annual limit">
        <div class="progress-ytd" style="width: ${ytdPct.toFixed(2)}%"></div>
        <div class="progress-projected" style="width: ${futurePct.toFixed(2)}%"></div>
        ${catchUpMarkerPct !== null ? `<div class="progress-catchup-marker" style="left: ${catchUpMarkerPct.toFixed(2)}%" title="Catch-up starts above ${formatCents(target.baseLimitCents, { showZeroCents: false })}"></div>` : ''}
      </div>
    </div>
  `;

  // 4. Employee Split + Mandatory Roth Catch-up Flag
  const rothFlagHtml = result.rothSplit.mandatoryRothRuleApplies
    ? `<div class="status-banner status-banner-info" style="margin-top: 0.75rem;">
        <span aria-hidden="true">i</span>
        <div>
          <strong>Mandatory Roth catch-up applies:</strong> Because 2026 FICA wages exceeded $${limits.rothCatchUpWageThreshold.toLocaleString('en-US')}, catch-up contributions above $${limits.electiveDeferral.toLocaleString('en-US')} (${formatCents(result.rothSplit.forcedRothCatchUpCents)}) must be Roth under SECURE 2.0 Section 603.
        </div>
      </div>`
    : `<div class="hint" style="margin-top: 0.5rem;">
        High-earner rule: if 2026 W-2 Box 3 FICA wages exceeded $${limits.rothCatchUpWageThreshold.toLocaleString('en-US')}, 2027 catch-up contributions must be Roth.
      </div>`;

  // 5. Employer Match (separated visually from employee savings)
  let matchHtml = '';
  if (result.match.hasMatchInputs) {
    const trueUpNote =
      result.match.matchLostWithoutTrueUpCents > 0
        ? `<div class="status-banner status-banner-warn" style="margin-top: 0.75rem;">
            <span aria-hidden="true">⚠</span>
            <div>
              <strong>Potential match lost (${result.match.trueUp === 'no' ? 'No true-up' : 'True-up unknown'}):</strong> Capping out early leaves <strong>${formatCents(result.match.matchLostWithoutTrueUpCents)}</strong> in employer match uncollected unless your plan makes a year-end true-up.
            </div>
          </div>`
        : '';

    matchHtml = `
      <h3 style="margin-top: 1.25rem;">Employer Money (Separate from your $${limits.electiveDeferral.toLocaleString('en-US')} limit)</h3>
      <div class="ledger-rows">
        <div class="ledger-row">
          <span class="ledger-row-label">Estimated remaining employer match</span>
          <span class="ledger-row-value">${formatCents(result.match.totalEmployerMatchCents)}</span>
        </div>
        <div class="ledger-row">
          <span class="ledger-row-label">Max match per paycheck</span>
          <span class="ledger-row-value">${formatCents(result.match.perPaycheckMaxMatchCents)}</span>
        </div>
      </div>
      ${trueUpNote}
    `;
  }

  // 6. Take-home estimate (ONLY if tax rates entered, clearly labelled estimate)
  let takeHomeHtml = '';
  if (result.takeHome.hasTaxRates) {
    takeHomeHtml = `
      <h3 style="margin-top: 1.25rem;">Take-Home Pay Estimate (Rough Estimate)</h3>
      <div class="ledger-rows">
        <div class="ledger-row">
          <span class="ledger-row-label">Estimated paycheck reduction (${result.takeHome.combinedMarginalRatePercent}% combined marginal rate)</span>
          <span class="ledger-row-value">-${formatCents(result.takeHome.regularPaycheckReductionCents)}</span>
        </div>
        <div class="ledger-row">
          <span class="ledger-row-label">Income tax withholding saved on pre-tax</span>
          <span class="ledger-row-value">${formatCents(result.takeHome.regularTaxSavingsEstimateCents)}</span>
        </div>
      </div>
      <p class="hint" style="margin-top: 0.5rem;">
        Estimate only based on your entered marginal rates. Pre-tax 401(k) deferrals do <strong>not</strong> reduce Social Security (6.2%) or Medicare (1.45%) taxes.
      </p>
    `;
  }

  // 7. Schedule toggle
  const scheduleRowsHtml = result.schedule
    .map(
      (row) => `
      <tr>
        <th>Paycheck #${row.paycheckNumber}${row.isAdjustedFinal ? ' (Final adj.)' : ''}</th>
        <td data-label="Employee">${formatCents(row.employeeCents)}</td>
        <td data-label="Pre-tax">${formatCents(row.preTaxCents)}</td>
        <td data-label="Roth">${formatCents(row.rothCents)}</td>
        ${result.match.hasMatchInputs ? `<td data-label="Match">${formatCents(row.employerMatchCents)}</td>` : ''}
        <td data-label="Cumulative">${formatCents(row.cumulativeEmployeeCents)}</td>
      </tr>`,
    )
    .join('');

  const scheduleHtml =
    result.schedule.length > 0
      ? `
      <details class="disclosure" style="margin-top: 1.25rem; border-bottom: 0;">
        <summary>View paycheck-by-paycheck schedule (${result.schedule.length} paychecks)</summary>
        <div class="disclosure-body">
          <div tabindex="0" role="region" aria-label="Paycheck contribution schedule" class="table-wrapper" style="max-block-size: 360px;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Paycheck</th>
                  <th>Employee</th>
                  <th>Pre-tax</th>
                  <th>Roth</th>
                  ${result.match.hasMatchInputs ? '<th>Match</th>' : ''}
                  <th>Cumulative</th>
                </tr>
              </thead>
              <tbody>${scheduleRowsHtml}</tbody>
            </table>
          </div>
        </div>
      </details>`
      : '';

  container.innerHTML = `
    <h2 class="results-section-heading">Your 2027 Per-Paycheck Plan</h2>
    <div class="result-headline-label">${escapeHtml(AGE_BAND_LABELS[result.selectedAgeBand!])} · Per remaining paycheck</div>
    <div class="result-headline-value tabular">${headlineAmount}</div>
    ${salaryShareLine}
    <p class="result-subline">${finalNote}</p>
    ${statusBanner}
    ${progressHtml}

    <h3>Employee Savings Breakdown</h3>
    <div class="ledger-rows">
      <div class="ledger-row">
        <span class="ledger-row-label">Remaining employee contributions</span>
        <span class="ledger-row-value">${formatCents(result.rothSplit.preTaxCents + result.rothSplit.rothCents)}</span>
      </div>
      <div class="ledger-row">
        <span class="ledger-row-label">Pre-tax portion</span>
        <span class="ledger-row-value">${formatCents(result.rothSplit.preTaxCents)}</span>
      </div>
      <div class="ledger-row">
        <span class="ledger-row-label">Roth portion</span>
        <span class="ledger-row-value">${formatCents(result.rothSplit.rothCents)}</span>
      </div>
      <div class="ledger-row">
        <span class="ledger-row-label">415(c) total additions cap (employee + employer)</span>
        <span class="ledger-row-value">${formatCents(target.annualAdditions415cLimitCents, { showZeroCents: false })}</span>
      </div>
    </div>
    ${rothFlagHtml}
    ${matchHtml}
    ${takeHomeHtml}
    ${scheduleHtml}
  `;
}
