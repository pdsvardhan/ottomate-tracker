// tests/todos-showcase.test.ts — the to-do display marker (iter-208 #1513, migration 0016).
// Schema rules + a contract run against a fresh throwaway DB, which also proves migration 0016
// applies on a cold clone (0015 creates project_todos, 0016 adds showcase_title).
import { describe, expect, it } from 'vitest';
import { authHeaders, ctx, makeReq } from './helpers';
import { TodoCreateSchema, TodoPatchSchema, normalizeTodoWrite } from '@/lib/validation/todos';
import { POST as projectsPost } from '@/app/api/projects/route';
import { GET as todosGet, POST as todosPost } from '@/app/api/projects/[slug]/todos/route';
import { PATCH as todoPatch } from '@/app/api/todos/[id]/route';
import { showcaseRoadmap } from '@/lib/showcase';

describe('showcase_title validation', () => {
  it('accepts a plain title (trimmed), null to clear, and absence', () => {
    expect(TodoPatchSchema.parse({ showcase_title: '  Offline mode  ' }).showcase_title).toBe('Offline mode');
    expect(TodoPatchSchema.parse({ showcase_title: null }).showcase_title).toBeNull();
    expect(TodoPatchSchema.parse({}).showcase_title).toBeUndefined();
    expect(TodoCreateSchema.parse({ title: 'raw #12 lib/x.ts:4', showcase_title: 'Faster search' }).showcase_title).toBe('Faster search');
  });
  it('rejects an empty or over-long title', () => {
    expect(TodoPatchSchema.safeParse({ showcase_title: '   ' }).success).toBe(false);
    expect(TodoPatchSchema.safeParse({ showcase_title: 'x'.repeat(141) }).success).toBe(false);
  });
  it('normalizeTodoWrite passes it through untouched', () => {
    expect(normalizeTodoWrite({ showcase_title: 'Offline mode' })).toMatchObject({ showcase_title: 'Offline mode' });
    expect(normalizeTodoWrite({ showcase_title: null })).toMatchObject({ showcase_title: null });
  });
});

const SLUG = 'iter208-todo-marker';

describe('marking a to-do through the API (fresh DB)', () => {
  let todoId = 0;

  it('creates a project and an unmarked raw to-do', async () => {
    const p = await projectsPost(makeReq('POST', '/api/projects', { slug: SLUG, display_name: 'Marker' }, authHeaders()));
    expect(p.status).toBe(201);
    const t = await todosPost(
      makeReq('POST', `/api/projects/${SLUG}/todos`, { title: 'fix lib/foo.ts:88 (#1234) HSBC alerts' }, authHeaders()),
      ctx({ slug: SLUG }),
    );
    expect(t.status).toBe(201);
    const { todo } = await t.json();
    expect(todo.showcase_title).toBeNull();
    todoId = todo.id;
  });

  it('PATCH without the bearer token is refused', async () => {
    const res = await todoPatch(
      makeReq('PATCH', `/api/todos/${todoId}`, { showcase_title: 'Sneaky' }),
      ctx({ id: String(todoId) }),
    );
    expect(res.status).toBe(401);
  });

  it('PATCH {showcase_title} marks it; the showcase shows only the plain title', async () => {
    const res = await todoPatch(
      makeReq('PATCH', `/api/todos/${todoId}`, { showcase_title: 'Alerts for missing statements' }, authHeaders()),
      ctx({ id: String(todoId) }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.todo.showcase_title).toBe('Alerts for missing statements');
    expect(body.ignored).toBeUndefined();

    const list = await todosGet(makeReq('GET', `/api/projects/${SLUG}/todos`), ctx({ slug: SLUG }));
    const { todos } = await list.json();
    const roadmap = showcaseRoadmap(todos);
    expect(roadmap).toEqual(['Alerts for missing statements']);
    expect(roadmap.join(' ')).not.toMatch(/HSBC|#1234|foo\.ts/);
  });

  it('PATCH {showcase_title:null} unmarks it and the section has nothing to show', async () => {
    const res = await todoPatch(
      makeReq('PATCH', `/api/todos/${todoId}`, { showcase_title: null }, authHeaders()),
      ctx({ id: String(todoId) }),
    );
    expect(res.status).toBe(200);
    const list = await todosGet(makeReq('GET', `/api/projects/${SLUG}/todos`), ctx({ slug: SLUG }));
    const { todos } = await list.json();
    expect(showcaseRoadmap(todos)).toEqual([]);
  });
});
