// Project Overview tab — Doc 1 detail view.

import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-200">{value || <span className="text-zinc-600">—</span>}</dd>
    </div>
  );
}

export default async function ProjectOverview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const project = db.select().from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) notFound();

  const non_goals = db.select().from(schema.project_non_goals)
    .where(eq(schema.project_non_goals.project_slug, slug))
    .orderBy(asc(schema.project_non_goals.sort_order)).all();
  const success_criteria = db.select().from(schema.project_success_criteria)
    .where(eq(schema.project_success_criteria.project_slug, slug))
    .orderBy(asc(schema.project_success_criteria.sort_order)).all();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2 space-y-6">
        {project.tagline && (
          <p className="text-lg text-zinc-300">{project.tagline}</p>
        )}
        {project.core_idea && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-2">Core idea</h3>
            <p className="text-sm text-zinc-400 whitespace-pre-wrap">{project.core_idea}</p>
          </div>
        )}
        {project.problem_statement && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-2">Problem statement</h3>
            <p className="text-sm text-zinc-400 whitespace-pre-wrap">{project.problem_statement}</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Success criteria</h3>
            {success_criteria.length === 0 ? (
              <p className="text-xs text-zinc-600">— none yet</p>
            ) : (
              <ul className="space-y-1.5 text-sm text-zinc-300 list-disc list-inside marker:text-emerald-500">
                {success_criteria.map((s) => <li key={s.id}>{s.content}</li>)}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Non-goals</h3>
            {non_goals.length === 0 ? (
              <p className="text-xs text-zinc-600">— none yet</p>
            ) : (
              <ul className="space-y-1.5 text-sm text-zinc-300 list-disc list-inside marker:text-rose-500">
                {non_goals.map((n) => <li key={n.id}>{n.content}</li>)}
              </ul>
            )}
          </div>
        </div>

        {project.preferences && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Preferences</h3>
            <div className="grid gap-3 md:grid-cols-2 text-xs text-zinc-400">
              <PrefBlock label="Likes" items={project.preferences?.likes} colour="text-emerald-400" />
              <PrefBlock label="Dislikes" items={project.preferences?.dislikes} colour="text-rose-400" />
              <PrefBlock label="Must haves" items={project.preferences?.must_haves} colour="text-cyan-400" />
              <PrefBlock label="Avoid" items={project.preferences?.avoid} colour="text-amber-400" />
            </div>
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Manifest</h3>
          <dl className="space-y-3">
            <Field label="Lifecycle phase" value={project.lifecycle_phase} />
            <Field label="Scope size" value={project.scope_size} />
            <Field label="Target devices" value={project.target_devices} />
            <Field label="Hosting" value={project.hosting_target} />
            <Field label="Port" value={project.port ? `:${project.port}` : null} />
            <Field
              label="Public URL"
              value={project.public_url ? (
                <a href={project.public_url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline break-all">
                  {project.public_url}
                </a>
              ) : null}
            />
            <Field
              label="Repo"
              value={project.repository_url ? (
                <a href={project.repository_url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline break-all">
                  {project.repository_url}
                </a>
              ) : null}
            />
            <Field
              label="Updated"
              value={project.updated_at ? new Date(project.updated_at).toLocaleString() : null}
            />
          </dl>
        </div>

        {project.tags && project.tags.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {project.tags.map((t) => (
                <span key={t} className="text-[11px] rounded-full bg-zinc-800/80 text-zinc-300 px-2 py-0.5">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function PrefBlock({ label, items, colour }: { label: string; items?: string[]; colour: string }) {
  return (
    <div>
      <div className={`text-[10px] uppercase tracking-wider ${colour}`}>{label}</div>
      {items && items.length > 0 ? (
        <ul className="mt-1 space-y-0.5 text-zinc-300">
          {items.map((i) => <li key={i}>· {i}</li>)}
        </ul>
      ) : (
        <p className="mt-1 text-zinc-600">— none</p>
      )}
    </div>
  );
}
