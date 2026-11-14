import type { PayFrequency } from './types';

export function getStandardPayPeriods(
  frequency: PayFrequency,
  hasExtraPaycheck = false,
): number {
  switch (frequency) {
    case 'weekly':
      return hasExtraPaycheck ? 53 : 52;
    case 'biweekly':
      return hasExtraPaycheck ? 27 : 26;
    case 'semimonthly':
      return 24;
    case 'monthly':
      return 12;
  }
}

export function supportsExtraPaycheck(frequency: PayFrequency): boolean {
  return frequency === 'weekly' || frequency === 'biweekly';
}

/**
 * Pure date helper: given an ISO date string (YYYY-MM-DD) for the first payday
 * of a calendar year, counts how many paydays occur in that calendar year
 * for weekly (7-day) or biweekly (14-day) schedules.
 */
export function countPaydaysInYearFromFirst(
  firstPaydayIso: string,
  frequency: 'weekly' | 'biweekly',
  targetYear: number,
): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(firstPaydayIso.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year !== targetYear) return null;

  const startMs = Date.UTC(year, month - 1, day);
  const check = new Date(startMs);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  const endMs = Date.UTC(targetYear, 11, 31);
  const stepDays = frequency === 'weekly' ? 7 : 14;
  const stepMs = stepDays * 24 * 60 * 60 * 1000;

  let count = 0;
  for (let current = startMs; current <= endMs; current += stepMs) {
    count += 1;
  }
  return count;
}
