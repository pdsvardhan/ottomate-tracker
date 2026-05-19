'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Width class — defaults to max-w-2xl. */
  widthClass?: string;
}

/**
 * Glass-panel modal wrapping Radix Dialog.
 * Use for catalog CRUD forms, bug submit, ADR expanded views, etc.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  widthClass = 'max-w-2xl',
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 ' +
            'w-[calc(100vw-2rem)] ' + widthClass + ' max-h-[85vh] overflow-y-auto ' +
            'rounded-2xl border border-zinc-800/60 ' +
            'bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-zinc-950/95 ' +
            'backdrop-blur-xl shadow-[0_0_60px_-20px_rgba(0,212,170,0.30)] p-6'
          }
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-zinc-100">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-xs text-zinc-500">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
