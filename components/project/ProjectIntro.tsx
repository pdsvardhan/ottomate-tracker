// First-impression block for first-time visitors (recruiters / friends / public).
// Lives at the top of the project Overview, BEFORE the pipeline.
// Composes core_idea + problem_statement into a 2-3 sentence audience-friendly intro.

interface ProjectIntroProps {
  displayName: string;
  tagline: string | null;
  coreIdea: string | null;
  problemStatement: string | null;
  publicUrl: string | null;
  repositoryUrl: string | null;
  port: number | null;
  hostingTarget: string | null;
  tags: string[];
}

export function ProjectIntro({
  displayName,
  tagline,
  coreIdea,
  problemStatement,
  publicUrl,
  repositoryUrl,
  port,
  hostingTarget,
  tags,
}: ProjectIntroProps) {
  // Render whichever narrative is richest: problem_statement > core_idea > tagline alone.
  const body = (problemStatement?.trim().length ?? 0) >= 80
    ? problemStatement
    : (coreIdea?.trim().length ?? 0) >= 40
    ? coreIdea
    : tagline;

  return (
    <div className="relative rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/50 via-zinc-900/30 to-zinc-950/40 backdrop-blur-xl p-6 overflow-hidden">
      {/* subtle accent in the corner */}
      <div aria-hidden className="absolute -top-12 -right-12 size-40 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute -bottom-12 -left-12 size-40 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-baseline gap-3 flex-wrap mb-3">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-200 via-zinc-100 to-violet-200 bg-clip-text text-transparent">
            {displayName}
          </h2>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="text-[10px] uppercase tracking-wider rounded-full bg-zinc-900/60 border border-zinc-800 text-zinc-400 px-1.5 py-0.5"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {body && (
          <p className="text-sm text-zinc-300 leading-relaxed max-w-3xl whitespace-pre-line">
            {body}
          </p>
        )}

        {tagline && body !== tagline && (
          <p className="mt-3 text-xs text-zinc-500 italic">{tagline}</p>
        )}

        <div className="mt-4 pt-4 border-t border-zinc-800/40 flex items-center gap-4 flex-wrap text-xs">
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-100 transition-colors"
            >
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              live <span className="text-zinc-500">↗</span>
            </a>
          )}
          {repositoryUrl && (
            <a
              href={repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              repo <span className="text-zinc-600">↗</span>
            </a>
          )}
          {port && (
            <span className="text-zinc-500 font-mono">:{port}</span>
          )}
          {hostingTarget && (
            <span className="text-zinc-600 font-mono">{hostingTarget}</span>
          )}
        </div>
      </div>
    </div>
  );
}
