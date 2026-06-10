# API inventory (generated)

> Generated 2026-06-10T16:07:51+05:30 by `scripts/generate-api-inventory.sh` from route code.
> Path/method/auth existence here outranks any prose doc. Do not hand-edit.

| route | methods | bearer-auth |
|---|---|---|
| `/api/[...notfound]` | GET POST PATCH PUT DELETE HEAD | no |
| `/api/audit/[slug]/anti-gaslight-violations` | GET | no |
| `/api/audit/[slug]` | GET | no |
| `/api/backup` | POST GET | yes |
| `/api/component-feedback` | GET POST | yes |
| `/api/components/[id]/component-options` | GET | no |
| `/api/components/[id]/pick` | POST | yes |
| `/api/components/[id]` | GET PATCH DELETE | yes |
| `/api/components/[id]/variants/[variantId]` | PATCH DELETE | yes |
| `/api/components/[id]/variants` | GET POST | yes |
| `/api/coverage` | GET | no |
| `/api/deploy-artifacts` | GET POST | yes |
| `/api/drift/[id]/resolve` | POST | yes |
| `/api/drift` | GET POST | yes |
| `/api/external-task-completed` | POST | yes |
| `/api/feature-claims` | GET POST PATCH | yes |
| `/api/flows/[id]/test` | POST | yes |
| `/api/graph/[slug]` | GET | no |
| `/api/health` | GET | no |
| `/api/inbox` | GET | no |
| `/api/inspirations/[id]` | GET | no |
| `/api/inspirations` | GET | no |
| `/api/iterations/[id]/cancel` | POST | yes |
| `/api/iterations/[id]/integrate` | POST | yes |
| `/api/iterations/[id]/items/[itemId]/build-status` | POST | yes |
| `/api/iterations/[id]/items/[itemId]/component-options` | GET | no |
| `/api/iterations/[id]/items/[itemId]/pick-component` | POST | yes |
| `/api/iterations/[id]/items/[itemId]` | PATCH DELETE | yes |
| `/api/iterations/[id]/items/[itemId]/split` | POST | yes |
| `/api/iterations/[id]/items/[itemId]/verifier-result` | POST | yes |
| `/api/iterations/[id]/items` | POST | yes |
| `/api/iterations/[id]/lock` | POST | yes |
| `/api/iterations/[id]` | GET | no |
| `/api/iterations/[id]/status` | GET | no |
| `/api/iterations/[id]/trace` | GET | no |
| `/api/master-components/[id]` | GET PUT DELETE | yes |
| `/api/master-components/[id]/source` | GET | no |
| `/api/master-components` | GET POST | yes |
| `/api/pack-up` | POST | yes |
| `/api/projects/[slug]/activity` | GET | no |
| `/api/projects/[slug]/adr-index/[id]/links/features/[featureId]` | PUT DELETE | yes |
| `/api/projects/[slug]/adr-index/[id]/links/risks/[riskId]` | PUT DELETE | yes |
| `/api/projects/[slug]/adr-index/[id]` | GET PATCH DELETE | yes |
| `/api/projects/[slug]/adr-index` | GET POST | yes |
| `/api/projects/[slug]/architecture/[file]` | GET | no |
| `/api/projects/[slug]/architecture` | GET | no |
| `/api/projects/[slug]/auth-config` | GET PUT | yes |
| `/api/projects/[slug]/components-pick/status` | GET | no |
| `/api/projects/[slug]/context-packet` | GET | no |
| `/api/projects/[slug]/data-concepts` | GET PUT | yes |
| `/api/projects/[slug]/data-contracts` | GET PUT | yes |
| `/api/projects/[slug]/data-sources/[id]` | GET PATCH DELETE | yes |
| `/api/projects/[slug]/data-sources` | GET POST | yes |
| `/api/projects/[slug]/features/[id]/acceptance-criteria/[itemId]` | PATCH DELETE | yes |
| `/api/projects/[slug]/features/[id]/acceptance-criteria` | GET POST | yes |
| `/api/projects/[slug]/features/[id]/links/dependencies/[depId]` | PUT DELETE | yes |
| `/api/projects/[slug]/features/[id]` | GET PATCH DELETE | yes |
| `/api/projects/[slug]/features` | GET POST | yes |
| `/api/projects/[slug]/flows/[id]/edge-cases/[itemId]` | PATCH DELETE | yes |
| `/api/projects/[slug]/flows/[id]/edge-cases` | GET POST | yes |
| `/api/projects/[slug]/flows/[id]/links/features/[featureId]` | PUT DELETE | yes |
| `/api/projects/[slug]/flows/[id]/links/pages/[pageId]` | PUT DELETE | yes |
| `/api/projects/[slug]/flows/[id]/pre-conditions/[itemId]` | PATCH DELETE | yes |
| `/api/projects/[slug]/flows/[id]/pre-conditions` | GET POST | yes |
| `/api/projects/[slug]/flows/[id]` | GET PATCH DELETE | yes |
| `/api/projects/[slug]/flows/[id]/steps/[stepId]` | PATCH DELETE | yes |
| `/api/projects/[slug]/flows/[id]/steps` | GET POST | yes |
| `/api/projects/[slug]/flows` | GET POST | yes |
| `/api/projects/[slug]/intent-drafts/extract-hints` | POST | yes |
| `/api/projects/[slug]/intent-drafts` | POST GET | yes |
| `/api/projects/[slug]/non-goals/[id]` | PATCH DELETE | yes |
| `/api/projects/[slug]/non-goals` | GET POST | yes |
| `/api/projects/[slug]/pages/[id]/components` | GET POST | yes |
| `/api/projects/[slug]/pages/[id]/entry-points/[itemId]` | PATCH DELETE | yes |
| `/api/projects/[slug]/pages/[id]/entry-points` | GET POST | yes |
| `/api/projects/[slug]/pages/[id]/links/features/[featureId]` | PUT DELETE | yes |
| `/api/projects/[slug]/pages/[id]` | GET PATCH DELETE | yes |
| `/api/projects/[slug]/pages` | GET POST | yes |
| `/api/projects/[slug]/policies` | GET PUT | yes |
| `/api/projects/[slug]/public-docs` | GET POST | yes |
| `/api/projects/[slug]/reports` | GET POST | yes |
| `/api/projects/[slug]/risk-instances/[id]/links/features/[featureId]` | PUT DELETE | yes |
| `/api/projects/[slug]/risk-instances/[id]/links/pages/[pageId]` | PUT DELETE | yes |
| `/api/projects/[slug]/risk-instances/[id]/resolve` | POST | yes |
| `/api/projects/[slug]/risk-instances/[id]` | GET PATCH DELETE | yes |
| `/api/projects/[slug]/risk-instances` | GET POST | yes |
| `/api/projects/[slug]` | GET PATCH DELETE | yes |
| `/api/projects/[slug]/secrets/[id]` | PATCH DELETE | yes |
| `/api/projects/[slug]/secrets` | GET POST | yes |
| `/api/projects/[slug]/success-criteria/[id]` | PATCH DELETE | yes |
| `/api/projects/[slug]/success-criteria` | GET POST | yes |
| `/api/projects/[slug]/third-party-services/[id]` | PATCH DELETE | yes |
| `/api/projects/[slug]/third-party-services` | GET POST | yes |
| `/api/projects/[slug]/todos` | GET POST | yes |
| `/api/projects/[slug]/ui-master-plan` | GET PUT | yes |
| `/api/projects/[slug]/yaml-mirror` | GET | no |
| `/api/projects` | GET POST | yes |
| `/api/reports/[id]/classify` | POST | yes |
| `/api/risks-heatmap` | GET | no |
| `/api/sanity-check` | GET | no |
| `/api/search` | GET | no |
| `/api/skill-events` | POST GET | yes |
| `/api/test-runs` | GET POST | yes |
| `/api/todos/[id]` | PATCH DELETE | yes |

Total route files: 104. Mutating routes WITHOUT bearer auth: 1 (must be 0 or each one justified below).

- UNAUTHENTICATED MUTATION: `/api/[...notfound]`
