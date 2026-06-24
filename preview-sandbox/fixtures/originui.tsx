import React from 'react';

// originui / shadcn (base-ui) primitive demos — upstream-mirrored, light theme.
//
// The preview build auto-detects `Cmp` as each component's root export and
// renders React.createElement(Cmp, props, children). These are compound
// primitives, so for the ones whose root renders children (Accordion,
// RadioGroup, Field, NumberField, PreviewCard) we compose the demo body from
// the same @base-ui/react primitives the catalog wrappers use, copying the
// catalog Tailwind classes so the parts look right. Prop-only primitives
// (Checkbox, Switch, Slider, Separator) just receive a representative state.

import { Accordion as OuiAccordion } from '@base-ui/react/accordion';
import { Radio as OuiRadio } from '@base-ui/react/radio';
import { Field as OuiField } from '@base-ui/react/field';
import { NumberField as OuiNumberField } from '@base-ui/react/number-field';
import { PreviewCard as OuiPreviewCard } from '@base-ui/react/preview-card';
import { ChevronDownIcon as OuiChevron, MinusIcon as OuiMinus, PlusIcon as OuiPlus } from 'lucide-react';

type OuiFixture = { props?: Record<string, unknown>; children?: React.ReactNode; wrap?: boolean; theme?: 'light' | 'dark' };

// --- Accordion demo body (shadcn FAQ demo, item-1 open by default) ----------
const OUI_ACCORDION_ITEMS = [
  {
    value: 'item-1',
    q: 'What are your shipping options?',
    a: 'We offer standard (5-7 days), express (2-3 days), and overnight shipping. Free shipping on international orders.',
  },
  {
    value: 'item-2',
    q: 'What is your return policy?',
    a: 'Returns are accepted within 30 days of delivery. Items must be unused and in original packaging for a full refund.',
  },
  {
    value: 'item-3',
    q: 'How can I contact customer support?',
    a: 'Reach us 24/7 via live chat, or email support@example.com. We typically reply within a couple of hours.',
  },
];
function OuiAccordionBody(): React.ReactNode {
  return OUI_ACCORDION_ITEMS.map((it) => (
    <OuiAccordion.Item key={it.value} value={it.value} className="border-b last:border-b-0">
      <OuiAccordion.Header className="flex">
        <OuiAccordion.Trigger className="flex flex-1 cursor-pointer items-start justify-between gap-4 rounded-md py-4 text-left font-medium text-sm outline-none transition-all data-panel-open:*:data-[slot=accordion-indicator]:rotate-180">
          {it.q}
          <OuiChevron
            className="pointer-events-none size-4 shrink-0 translate-y-0.5 opacity-80 transition-transform duration-200"
            data-slot="accordion-indicator"
          />
        </OuiAccordion.Trigger>
      </OuiAccordion.Header>
      <OuiAccordion.Panel className="h-(--accordion-panel-height) overflow-hidden text-muted-foreground text-sm transition-[height] duration-200 data-ending-style:h-0 data-starting-style:h-0">
        <div className="pt-0 pb-4 text-zinc-500">{it.a}</div>
      </OuiAccordion.Panel>
    </OuiAccordion.Item>
  ));
}

// --- RadioGroup demo body (3 plan options, "pro" selected) ------------------
const OUI_RADIO_OPTS = [
  { value: 'starter', label: 'Starter', hint: 'For individuals getting started.' },
  { value: 'pro', label: 'Pro', hint: 'For growing teams and projects.' },
  { value: 'team', label: 'Team', hint: 'Advanced controls and SSO.' },
];
function ouiRadioClass(): string {
  return 'relative inline-flex size-4.5 shrink-0 items-center justify-center rounded-full border border-input bg-background shadow-xs outline-none transition-shadow sm:size-4';
}
function OuiRadioGroupBody(): React.ReactNode {
  return OUI_RADIO_OPTS.map((o) => (
    <label key={o.value} className="flex cursor-pointer items-start gap-3">
      <OuiRadio.Root value={o.value} className={ouiRadioClass()} style={{ marginTop: 2 }}>
        <OuiRadio.Indicator className="absolute -inset-px flex size-4.5 items-center justify-center rounded-full before:size-2 before:rounded-full before:bg-white data-unchecked:hidden data-checked:bg-zinc-900 sm:size-4 sm:before:size-1.5" />
      </OuiRadio.Root>
      <span className="flex flex-col">
        <span className="font-medium text-sm text-zinc-900">{o.label}</span>
        <span className="text-xs text-zinc-500">{o.hint}</span>
      </span>
    </label>
  ));
}

// --- Field demo body (labeled email field with description) -----------------
function OuiFieldBody(): React.ReactNode {
  return (
    <>
      <OuiField.Label className="inline-flex items-center gap-2 font-medium text-sm text-zinc-900">
        Email address
      </OuiField.Label>
      <OuiField.Control
        defaultValue="ada@example.com"
        placeholder="you@example.com"
        className="h-9 w-72 rounded-lg border border-input bg-background px-3 text-sm text-zinc-900 shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
      />
      <OuiField.Description className="text-muted-foreground text-xs text-zinc-500">
        We&apos;ll only use this to send you receipts.
      </OuiField.Description>
    </>
  );
}

// --- NumberField demo body (quantity stepper, value 4) ----------------------
function OuiNumberFieldBody(): React.ReactNode {
  return (
    <>
      <label className="font-medium text-sm text-zinc-900" data-slot="label">Quantity</label>
      <OuiNumberField.Group className="relative flex w-44 justify-between rounded-lg border border-input bg-background text-sm text-zinc-900 shadow-xs outline-none focus-within:ring-2 focus-within:ring-zinc-400 [&_svg]:size-4">
        <OuiNumberField.Decrement className="flex shrink-0 cursor-pointer items-center justify-center rounded-s-lg px-3 transition-colors hover:bg-zinc-100">
          <OuiMinus />
        </OuiNumberField.Decrement>
        <OuiNumberField.Input className="h-9 w-full min-w-0 grow bg-transparent px-3 text-center tabular-nums outline-none" />
        <OuiNumberField.Increment className="flex shrink-0 cursor-pointer items-center justify-center rounded-e-lg px-3 transition-colors hover:bg-zinc-100">
          <OuiPlus />
        </OuiNumberField.Increment>
      </OuiNumberField.Group>
    </>
  );
}

// --- PreviewCard demo body (link trigger + hover popup, open by default) ----
function OuiPreviewCardBody(): React.ReactNode {
  return (
    <>
      <OuiPreviewCard.Trigger className="font-medium text-sm text-blue-600 underline underline-offset-4">
        @ottomate
      </OuiPreviewCard.Trigger>
      <OuiPreviewCard.Portal>
        <OuiPreviewCard.Positioner sideOffset={8} className="z-50">
          <OuiPreviewCard.Popup className="relative flex w-64 flex-col gap-2 rounded-lg border bg-white p-4 text-sm text-zinc-900 shadow-lg">
            <img
              src="https://i.pravatar.cc/64?img=12"
              alt="avatar"
              width={40}
              height={40}
              style={{ borderRadius: 9999 }}
            />
            <span className="font-semibold">Ottomate</span>
            <span className="text-zinc-500">
              Self-hosted component catalog with live inline previews.
            </span>
            <span className="text-xs text-zinc-400">1.2k followers · 84 components</span>
          </OuiPreviewCard.Popup>
        </OuiPreviewCard.Positioner>
      </OuiPreviewCard.Portal>
    </>
  );
}

export const overrides: Record<string, OuiFixture> = {
  // Accordion — shadcn FAQ demo, single+collapsible, item-1 open.
  'mc-accordion-shadcn': {
    props: { className: 'w-96', defaultValue: ['item-1'] },
    children: <OuiAccordionBody />,
    theme: 'light',
  },
  // Checkbox — "Accept terms and conditions", checked.
  'mc-checkbox-shadcn': {
    props: { defaultChecked: true, 'aria-label': 'Accept terms and conditions' },
    children: null,
    theme: 'light',
  },
  // Field — labeled email input with description.
  'mc-field': {
    props: { className: 'flex flex-col items-start gap-2' },
    children: <OuiFieldBody />,
    theme: 'light',
  },
  // NumberField — quantity stepper starting at 4.
  'mc-number-field': {
    props: { defaultValue: 4, min: 0, max: 99, className: 'flex w-44 flex-col items-start gap-2' },
    children: <OuiNumberFieldBody />,
    theme: 'light',
  },
  // PreviewCard — hover-card with profile popup, open by default.
  'mc-preview-card': {
    props: { open: true },
    children: <OuiPreviewCardBody />,
    theme: 'light',
  },
  // RadioGroup — 3 plan options, "pro" selected.
  'mc-radio-group': {
    props: { defaultValue: 'pro', className: 'flex flex-col gap-3', 'aria-label': 'Plan' },
    children: <OuiRadioGroupBody />,
    theme: 'light',
  },
  // Separator — horizontal divider in a labeled context.
  'mc-separator': {
    props: { orientation: 'horizontal', className: 'w-72 bg-zinc-200' },
    children: null,
    theme: 'light',
  },
  // Slider — single thumb at 60.
  'mc-slider-shadcn': {
    props: { defaultValue: [60], min: 0, max: 100, className: 'w-72' },
    children: null,
    theme: 'light',
  },
  // Switch — on (Airplane Mode demo state).
  'mc-switch': {
    props: { defaultChecked: true, 'aria-label': 'Airplane Mode' },
    children: null,
    theme: 'light',
  },
};
