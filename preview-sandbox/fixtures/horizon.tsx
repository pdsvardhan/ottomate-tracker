import React from 'react';

// Horizon UI component demo. The Horizon dashboard sidebar "Upgrade to PRO"
// card (FreeCard) is fully self-contained — it renders its own gradient,
// badge, copy, and CTA with no props or children. Horizon UI dashboards are
// dark (navy sidebar), so it previews on a dark background.

type HorizonFixture = { props?: Record<string, unknown>; children?: React.ReactNode; wrap?: boolean; theme?: 'light' | 'dark' };

export const overrides: Record<string, HorizonFixture> = {
  // Self-contained dark sidebar upgrade card — no props/children needed.
  'mc-shell-horizon-sidebar-card': {
    props: {},
    children: null,
    theme: 'dark',
  },
};
