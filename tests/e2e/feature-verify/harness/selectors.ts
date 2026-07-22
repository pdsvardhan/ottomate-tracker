// Feature-verify harness — stable selectors (Task 3). NO self-healing selectors on the gate:
// they can silently heal over a real regression. Use [data-oid] (Task 1's provenance stamp,
// value = the entity id — see stage-3-codegen.md), role, or testid only.

import type { Page, Locator, FrameLocator } from '@playwright/test';

/** Escape a data-oid value for a CSS attribute selector. */
function cssAttrEscape(v: string): string {
  return v.replace(/["\\]/g, '\\$&');
}

/** Locate an element by its data-oid entity id (component root or page-section root). */
export function oid(scope: Page | FrameLocator, id: string): Locator {
  return scope.locator(`[data-oid="${cssAttrEscape(id)}"]`);
}

/** Locate a descendant by data-oid within an already-scoped locator. */
export function oidWithin(parent: Locator, id: string): Locator {
  return parent.locator(`[data-oid="${cssAttrEscape(id)}"]`);
}
