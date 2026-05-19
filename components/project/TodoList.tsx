'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FILTER_CONTROL_CLASSES } from '@/components/ui/FilterBar';

interface Todo {
  id: number;
  title: string;
  done: boolean;
  sort_order: number | null;
}

interface TodoListProps {
  projectSlug: string;
  initialTodos: Todo[];
}

export function TodoList({ projectSlug, initialTodos }: TodoListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);

  function token() {
    return typeof window !== 'undefined' ? window.sessionStorage.getItem('ottomate_token') : null;
  }

  async function addTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectSlug}/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!res.ok) return;
      const { todo } = await res.json();
      setTodos((prev) => [...prev, todo]);
      setNewTitle('');
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  async function toggle(t: Todo) {
    const optimistic = todos.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x));
    setTodos(optimistic);
    await fetch(`/api/todos/${t.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      },
      body: JSON.stringify({ done: !t.done }),
    });
    startTransition(() => router.refresh());
  }

  async function remove(t: Todo) {
    if (!confirm('Delete this task?')) return;
    setTodos((prev) => prev.filter((x) => x.id !== t.id));
    await fetch(`/api/todos/${t.id}`, {
      method: 'DELETE',
      headers: token() ? { Authorization: `Bearer ${token()}` } : {},
    });
    startTransition(() => router.refresh());
  }

  const remaining = todos.filter((t) => !t.done).length;

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-200">To-do</h3>
        <span className="text-[11px] font-mono text-zinc-500">
          {remaining} / {todos.length} open
        </span>
      </div>

      {todos.length === 0 ? (
        <p className="text-xs text-zinc-600 italic mb-3">No tasks yet — add one below.</p>
      ) : (
        <ul className="space-y-1 mb-3">
          {todos.map((t) => (
            <li key={t.id} className="flex items-center gap-2 group">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggle(t)}
                className="size-3.5 rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-cyan-700/40 focus:ring-1"
              />
              <span className={'flex-1 text-sm ' + (t.done ? 'line-through text-zinc-600' : 'text-zinc-300')}>
                {t.title}
              </span>
              <button
                type="button"
                onClick={() => remove(t)}
                className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-500 hover:text-rose-300 transition-opacity"
                title="Delete"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addTodo} className="flex items-center gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="+ add task"
          disabled={busy}
          className={FILTER_CONTROL_CLASSES + ' flex-1 text-xs'}
        />
        <button
          type="submit"
          disabled={busy || !newTitle.trim()}
          className="text-xs text-cyan-300 hover:text-cyan-100 transition-colors disabled:opacity-50"
        >
          add
        </button>
      </form>
    </div>
  );
}
