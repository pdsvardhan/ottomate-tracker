// zod schemas for Doc 4 (Pages + Components + Variants + Entry Points).

import { z } from 'zod';

const layoutTypeEnum = z.enum([
  'dashboard', 'list', 'detail', 'form', 'wizard', 'modal', 'popup',
]);
const loadingStateEnum = z.enum(['skeleton', 'spinner', 'progressive']);
const permissionsEnum = z.enum(['anonymous', 'logged-in', 'admin', 'custom']);
const mobileHandlingEnum = z.enum(['responsive', 'mobile-only', 'desktop-only', 'N-A']);

export const PageCreateSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1),
  route: z.string().min(1),
  purpose: z.string().nullish(),
  layout_type: layoutTypeEnum.nullish(),
  empty_state: z.string().nullish(),
  loading_state: loadingStateEnum.nullish(),
  error_state: z.string().nullish(),
  permissions: permissionsEnum.optional(),
  mobile_handling: mobileHandlingEnum.optional(),
});

export const PagePatchSchema = PageCreateSchema.omit({ id: true }).partial();

export const EntryPointCreateSchema = z.object({
  content: z.string().min(1).max(500),
});
export const EntryPointPatchSchema = EntryPointCreateSchema.partial();

const componentCategoryEnum = z.enum([
  'input', 'display', 'navigation', 'feedback', 'layout', 'overlay',
]);

export const ComponentCreateSchema = z.object({
  name: z.string().min(1),
  purpose_on_page: z.string().nullish(),
  category: componentCategoryEnum.nullish(),
  data_consumed: z.string().nullish(),
  data_produced: z.string().nullish(),
  picked: z.boolean().optional(),
  asset_library_ref: z.string().nullish(),
});
export const ComponentPatchSchema = ComponentCreateSchema.partial();

export const VariantCreateSchema = z.object({
  variant_name: z.string().min(1),
  sort_order: z.number().int().min(0).optional(),
});
export const VariantPatchSchema = VariantCreateSchema.partial();
