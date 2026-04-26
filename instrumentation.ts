// Next.js boot hook — runs once when the server starts.
// Used to spin up the chokidar watcher for /repos.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.OTTOMATE_DISABLE_WATCHER === 'true') return;
    try {
      const { startWatcher } = await import('./lib/sync/watcher');
      await startWatcher();
    } catch (err) {
      console.error('[ottomate] watcher failed to start:', err);
    }
  }
}
