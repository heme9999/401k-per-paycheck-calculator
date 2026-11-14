import type { SupportedYear } from './limits';

export const CURRENT_YEAR: SupportedYear = 2027;

export const SITE = {
  name: '2027 401(k) Per-Paycheck Calculator',
  shortName: '2027 401(k) Calculator',
  url: 'https://401k-per-paycheck-calculator.pages.dev',
  lastUpdated: '2026-11-13',
  language: 'en-US',
} as const;

export interface NavGuideLink {
  readonly href: string;
  readonly title: string;
  readonly summary: string;
}

export const INNER_GUIDES: readonly NavGuideLink[] = [
  {
    href: '/2027-401k-limits/',
    title: '2027 401(k) Contribution Limits',
    summary: 'Official IRS Notice 2026-66 limits: $25,500 base, $34,000 at 50+, $37,250 at 60–63, and $75,000 total 415(c).',
  },
  {
    href: '/how-much-401k-per-paycheck-to-max-out-2027/',
    title: 'How Much Per Paycheck to Max Out in 2027',
    summary: 'Exact per-paycheck amounts for weekly, biweekly (26 and 27), semi-monthly, and monthly schedules.',
  },
  {
    href: '/401k-catch-up-2027/',
    title: '2027 401(k) Catch-Up Contributions (50+)',
    summary: 'How the $8,500 catch-up works, the Dec 31 age rule, and why 64+ returns to $8,500.',
  },
  {
    href: '/401k-super-catch-up-60-63-2027/',
    title: 'Ages 60–63 Super Catch-Up ($11,750)',
    summary: 'How SECURE 2.0 replaces the $8,500 catch-up with $11,750 for ages 60–63 ($37,250 total).',
  },
  {
    href: '/roth-catch-up-high-earners/',
    title: 'Mandatory Roth Catch-Up ($155,000 Rule)',
    summary: 'SECURE 2.0 Section 603: why 2026 FICA wages over $155,000 require Roth catch-up contributions in 2027.',
  },
  {
    href: '/27-paychecks-401k-2027/',
    title: '27 Biweekly & 53 Weekly Paychecks in 2027',
    summary: 'Why Jan 1, 2027 (Friday) creates 27 biweekly or 53 weekly paydays—and how constructive receipt applies.',
  },
  {
    href: '/401k-limit-changing-jobs/',
    title: '401(k) Limits When Changing Jobs Midyear',
    summary: 'The $25,500 elective deferral limit is per person across all employers, not per plan.',
  },
  {
    href: '/401k-match-true-up/',
    title: 'Employer Match & True-Up Explained',
    summary: 'How front-loading can forfeit per-paycheck employer match if your plan lacks a year-end true-up.',
  },
  {
    href: '/401k-take-home-pay-impact/',
    title: 'How 401(k) Contributions Affect Take-Home Pay',
    summary: 'Why pre-tax deferrals reduce federal/state income tax withholding—but never Social Security or Medicare.',
  },
  {
    href: '/roth-vs-pretax-401k-2027/',
    title: 'Roth vs. Pre-Tax 401(k) in 2027',
    summary: 'How to split contributions using 2027 federal tax brackets and the $155,000 Roth catch-up rule.',
  },
  {
    href: '/401k-excess-contribution-fix/',
    title: 'How to Fix Excess 401(k) Contributions',
    summary: 'Step-by-step corrective distribution guide and the April 15 deadline if you over-contributed in 2027.',
  },
];
