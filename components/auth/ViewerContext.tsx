'use client';

// Client-side view of the owner/visitor rule (lib/viewer.ts). The root layout decides it from
// the request headers and provides it here, so client components can hide owner-only controls
// (uploads, ratings, delete) in the visitor view. The default is the visitor view: a component
// rendered outside the provider never shows an owner control by accident.

import { createContext, useContext, type ReactNode } from 'react';
import type { Viewer } from '@/lib/viewer';

const ViewerContext = createContext<Viewer>({ owner: false });

export function ViewerProvider({ owner, children }: { owner: boolean; children: ReactNode }) {
  return <ViewerContext.Provider value={{ owner }}>{children}</ViewerContext.Provider>;
}

export function useViewer(): Viewer {
  return useContext(ViewerContext);
}
