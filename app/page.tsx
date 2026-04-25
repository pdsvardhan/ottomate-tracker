// Ottomate tracker — placeholder home page (scaffolding)
// Real homepage with project dashboard comes in next build phase.

export default function HomePage() {
  return (
    <main className="container mx-auto p-8 max-w-4xl">
      <header className="mb-12">
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
          Ottomate
        </h1>
        <p className="mt-3 text-lg text-zinc-400">
          Web project tracker for VAULT7A. Companion to the <code className="px-1.5 py-0.5 rounded bg-zinc-900 text-cyan-300 text-sm">/ottomate</code> skill.
        </p>
      </header>

      <section className="space-y-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-xl font-semibold mb-2">🛠️ Scaffolding</h2>
          <p className="text-zinc-400">
            This is the foundation build. Full tracker UI (project list, detail tabs, iteration lock-in gate, cross-cutting features) comes in the next phase.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="font-semibold text-cyan-400 mb-2">What works now</h3>
            <ul className="text-sm text-zinc-400 space-y-1">
              <li>• Database scaffolding (drizzle + SQLite)</li>
              <li>• Schema migrations</li>
              <li>• Docker compose</li>
              <li>• Health endpoint</li>
            </ul>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="font-semibold text-violet-400 mb-2">Coming next</h3>
            <ul className="text-sm text-zinc-400 space-y-1">
              <li>• Project dashboard (cards grid)</li>
              <li>• Per-project detail (tabbed)</li>
              <li>• Stage 4 lock-in gate UI</li>
              <li>• Bug Inbox + Coverage + Search</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-amber-900/50 bg-amber-950/30 p-6">
          <h3 className="font-semibold text-amber-300 mb-2">⚠️ Status</h3>
          <p className="text-sm text-amber-100/70">
            This is a scaffolding deploy. Old tracker (v2 at port 8100) is still the live one. Cutover happens after this version reaches feature parity.
          </p>
        </div>
      </section>

      <footer className="mt-16 pt-8 border-t border-zinc-800 text-sm text-zinc-500">
        <p>Ottomate v0.1.0 · Port 8110 · <code className="text-zinc-400">ottomate.vault7a.xyz</code></p>
      </footer>
    </main>
  );
}
