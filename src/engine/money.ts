/**
 * Integer-cents helpers to prevent floating-point drift in payroll arithmetic.
 */

export function toCents(dollars: number): number {
  if (!Number.isFinite(dollars)) return 0;
  return Math.round(dollars * 100);
}

export function toDollars(cents: number): number {
  return cents / 100;
}

export function clampCents(cents: number, min: number, max: number): number {
  return Math.min(Math.max(cents, min), max);
}

export function percentOfCents(cents: number, percent: number): number {
  if (!Number.isFinite(cents) || !Number.isFinite(percent)) return 0;
  return Math.round((cents * percent) / 100);
}

export function formatCents(cents: number, options?: { showZeroCents?: boolean }): string {
  const showZeroCents = options?.showZeroCents ?? true;
  const sign = cents < 0 ? '-' : '';
  const absCents = Math.abs(Math.round(cents));
  const dollars = absCents / 100;

  if (!showZeroCents && absCents % 100 === 0) {
    return `${sign}$${(absCents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }

  return `${sign}$${dollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(percent: number, decimals = 2): string {
  if (!Number.isFinite(percent)) return '0%';
  return `${percent.toFixed(decimals)}%`;
}
