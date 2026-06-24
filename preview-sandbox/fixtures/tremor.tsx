import React from 'react';

// Per-library upstream-demo ports (iter-36 Bucket A). theme: match upstream bg.
// Tremor charts are light-themed and prop-driven (data arrays + index/categories).

// --- shared synthetic data --------------------------------------------------

// Standard Tremor multi-series monthly shape: index="date", categories=[...]
const monthlyRevenue = [
  { date: 'Jan 24', Revenue: 2400, Expenses: 1400 },
  { date: 'Feb 24', Revenue: 1900, Expenses: 1500 },
  { date: 'Mar 24', Revenue: 3200, Expenses: 1700 },
  { date: 'Apr 24', Revenue: 2780, Expenses: 1908 },
  { date: 'May 24', Revenue: 3490, Expenses: 2300 },
  { date: 'Jun 24', Revenue: 3800, Expenses: 2100 },
  { date: 'Jul 24', Revenue: 4100, Expenses: 2400 },
  { date: 'Aug 24', Revenue: 3950, Expenses: 2250 },
  { date: 'Sep 24', Revenue: 4600, Expenses: 2600 },
  { date: 'Oct 24', Revenue: 5200, Expenses: 2900 },
  { date: 'Nov 24', Revenue: 4800, Expenses: 3100 },
  { date: 'Dec 24', Revenue: 6100, Expenses: 3400 },
];

const usdFormatter = (n: number) =>
  `$${Intl.NumberFormat('us').format(n).toString()}`;

// Tracker: ~30 day uptime blocks (mix emerald / red / gray). Tremor's Tracker
// uses `color` directly as a Tailwind bg className.
const trackerData = Array.from({ length: 30 }, (_, i) => {
  let color = 'bg-emerald-600';
  let tooltip = 'Operational';
  if (i === 7 || i === 22) {
    color = 'bg-red-600';
    tooltip = 'Downtime';
  } else if (i === 4 || i === 15 || i === 26) {
    color = 'bg-gray-400';
    tooltip = 'Maintenance';
  }
  return { color, tooltip };
});

export const overrides: Record<string, any> = {
  // CategoryBar: values[] + colors[] (chart color keys), optional marker
  'mc-category-bar': {
    props: {
      values: [40, 30, 20, 10],
      colors: ['emerald', 'amber', 'orange', 'red'],
      marker: { value: 62, tooltip: '62%' },
      className: 'w-96',
    },
    theme: 'light',
  },

  // AreaChart: data[] + index + categories[] + colors[]
  'mc-chart-area': {
    props: {
      data: monthlyRevenue,
      index: 'date',
      categories: ['Revenue', 'Expenses'],
      colors: ['blue', 'emerald'],
      valueFormatter: usdFormatter,
      yAxisWidth: 56,
      className: 'h-72 w-[36rem]',
    },
    theme: 'light',
  },

  // BarChart: data[] + index + categories[] + colors[]
  'mc-chart-bar-tremor': {
    props: {
      data: monthlyRevenue,
      index: 'date',
      categories: ['Revenue', 'Expenses'],
      colors: ['blue', 'violet'],
      valueFormatter: usdFormatter,
      yAxisWidth: 56,
      className: 'h-72 w-[36rem]',
    },
    theme: 'light',
  },

  // LineChart: data[] + index + categories[] + colors[]
  'mc-chart-line': {
    props: {
      data: monthlyRevenue,
      index: 'date',
      categories: ['Revenue', 'Expenses'],
      colors: ['blue', 'emerald'],
      valueFormatter: usdFormatter,
      yAxisWidth: 56,
      className: 'h-72 w-[36rem]',
    },
    theme: 'light',
  },

  // ProgressCircle: value (0-100), label via children
  'mc-progress-circle-tremor': {
    props: {
      value: 72,
      radius: 45,
      strokeWidth: 7,
    },
    children: (
      <span className="text-sm font-medium text-gray-900">72%</span>
    ),
    theme: 'light',
  },

  // Tracker: data[] of { color, tooltip } where color is a Tailwind bg class
  'mc-tracker': {
    props: {
      data: trackerData,
      className: 'w-[36rem]',
    },
    theme: 'light',
  },
};
