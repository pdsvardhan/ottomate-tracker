// Virtual sandbox files injected into every Sandpack preview so that catalog
// components importing the shadcn convention (`@/lib/utils`, `@/components/ui/*`)
// resolve instead of going blank. iter-7 #62: the dominant live-render blocker
// was `@/lib/utils` (97 components) + a long tail of `@/components/ui/*` primitives.
//
// These are LIGHTWEIGHT, API-compatible stand-ins — not the real shadcn/Radix
// implementations. The bar is "renders without crashing and looks plausible",
// not pixel-fidelity. Components are placed at the sandbox root, so `@/` is
// rewritten to `./` in LivePreview and resolves here:
//   @/lib/utils            -> /lib/utils.ts
//   @/components/ui/button -> /components/ui/button.tsx
//
// Anything not shimmed (e.g. @/lib/chartUtils, @/context/*, @/components/icons)
// still falls through to the graceful "renders in context — see source" panel.

/** npm packages the shims themselves pull from the Sandpack CDN. */
export const SANDBOX_SHIM_DEPS: Record<string, string> = {
  clsx: 'latest',
  'tailwind-merge': 'latest',
};

const UTILS = `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

const BUTTON = `import * as React from 'react';
import { cn } from '../../lib/utils';

export function buttonVariants() {
  return '';
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
    asChild?: boolean;
  }
>(function Button({ className, variant, size, asChild, children, ...props }, ref) {
  const tone =
    variant === 'outline' || variant === 'ghost' || variant === 'secondary'
      ? 'border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800'
      : variant === 'destructive'
        ? 'bg-rose-600 text-white hover:bg-rose-500'
        : 'bg-zinc-100 text-zinc-900 hover:bg-white';
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium px-4 py-2 transition-colors',
        tone,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
Button.displayName = 'Button';
`;

const INPUT = `import * as React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-1 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-600',
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';
`;

const TEXTAREA = `import * as React from 'react';
import { cn } from '../../lib/utils';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[60px] w-full rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-600',
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';
`;

const LABEL = `import * as React from 'react';
import { cn } from '../../lib/utils';

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(function Label({ className, ...props }, ref) {
  return (
    <label ref={ref} className={cn('text-sm font-medium text-zinc-200', className)} {...props} />
  );
});
Label.displayName = 'Label';
`;

const BADGE = `import * as React from 'react';
import { cn } from '../../lib/utils';

export function badgeVariants() {
  return '';
}

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-0.5 text-xs font-medium text-zinc-200',
        className,
      )}
      {...props}
    />
  );
}
`;

const SEPARATOR = `import * as React from 'react';
import { cn } from '../../lib/utils';

export function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical'; decorative?: boolean }) {
  return (
    <div
      role="separator"
      className={cn(
        'bg-zinc-800',
        orientation === 'vertical' ? 'h-full w-px' : 'h-px w-full',
        className,
      )}
      {...props}
    />
  );
}
`;

const CARD = `import * as React from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-zinc-800 bg-zinc-900/40 text-zinc-100', className)} {...p} />;
}
export function CardHeader({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-6', className)} {...p} />;
}
export function CardTitle({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('font-semibold leading-none', className)} {...p} />;
}
export function CardDescription({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-sm text-zinc-400', className)} {...p} />;
}
export function CardAction({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('ml-auto', className)} {...p} />;
}
export function CardContent({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...p} />;
}
export function CardFooter({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...p} />;
}
`;

// Compound interactive primitives: lightweight passthrough so content is visible
// and the importing component does not crash. Not interactive.
const POPOVER = `import * as React from 'react';
import { cn } from '../../lib/utils';

export function Popover({ children }: { children?: React.ReactNode }) {
  return <div className="relative inline-block">{children}</div>;
}
export function PopoverTrigger({ children, asChild, ...p }: React.HTMLAttributes<HTMLSpanElement> & { asChild?: boolean }) {
  return <span {...p}>{children}</span>;
}
export function PopoverAnchor({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
export function PopoverContent({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-2 rounded-md border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-100 shadow-xl', className)} {...p}>
      {children}
    </div>
  );
}
`;

const HOVER_CARD = `import * as React from 'react';
import { cn } from '../../lib/utils';

export function HoverCard({ children }: { children?: React.ReactNode }) {
  return <div className="relative inline-block">{children}</div>;
}
export function HoverCardTrigger({ children, asChild, ...p }: React.HTMLAttributes<HTMLSpanElement> & { asChild?: boolean }) {
  return <span {...p}>{children}</span>;
}
export function HoverCardContent({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-2 rounded-md border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-100 shadow-xl', className)} {...p}>
      {children}
    </div>
  );
}
`;

const TOOLTIP = `import * as React from 'react';

export function TooltipProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
export function Tooltip({ children }: { children?: React.ReactNode }) {
  return <span className="relative inline-block">{children}</span>;
}
export function TooltipTrigger({ children, asChild, ...p }: React.HTMLAttributes<HTMLSpanElement> & { asChild?: boolean }) {
  return <span {...p}>{children}</span>;
}
export function TooltipContent({ children }: { children?: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
`;

const COLLAPSIBLE = `import * as React from 'react';

export function Collapsible({ children }: { children?: React.ReactNode }) {
  return <div>{children}</div>;
}
export function CollapsibleTrigger({ children, asChild, ...p }: React.HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  return <button type="button" {...p}>{children}</button>;
}
export function CollapsibleContent({ children }: { children?: React.ReactNode }) {
  return <div>{children}</div>;
}
`;

const SCROLL_AREA = `import * as React from 'react';
import { cn } from '../../lib/utils';

export function ScrollArea({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('overflow-auto', className)} {...p}>{children}</div>;
}
export function ScrollBar() {
  return null;
}
`;

const SELECT = `import * as React from 'react';
import { cn } from '../../lib/utils';

export function Select({ children }: { children?: React.ReactNode }) {
  return <div className="relative">{children}</div>;
}
export function SelectGroup({ children }: { children?: React.ReactNode }) {
  return <div>{children}</div>;
}
export function SelectValue({ placeholder }: { placeholder?: React.ReactNode }) {
  return <span className="text-zinc-400">{placeholder}</span>;
}
export function SelectTrigger({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex h-9 items-center justify-between rounded-md border border-zinc-700 bg-zinc-900/60 px-3 text-sm text-zinc-100', className)} {...p}>
      {children}
    </div>
  );
}
export function SelectContent({ children }: { children?: React.ReactNode }) {
  return <div className="mt-1 rounded-md border border-zinc-700 bg-zinc-900 p-1 text-sm text-zinc-100">{children}</div>;
}
export function SelectLabel({ children }: { children?: React.ReactNode }) {
  return <div className="px-2 py-1.5 text-xs text-zinc-500">{children}</div>;
}
export function SelectItem({ children, ...p }: React.HTMLAttributes<HTMLDivElement> & { value?: string }) {
  return <div className="rounded px-2 py-1.5 hover:bg-zinc-800" {...p}>{children}</div>;
}
export function SelectSeparator() {
  return <div className="my-1 h-px bg-zinc-800" />;
}
export function SelectScrollUpButton() { return null; }
export function SelectScrollDownButton() { return null; }
`;

const DROPDOWN = `import * as React from 'react';
import { cn } from '../../lib/utils';

export function DropdownMenu({ children }: { children?: React.ReactNode }) {
  return <div className="relative inline-block">{children}</div>;
}
export function DropdownMenuTrigger({ children, asChild, ...p }: React.HTMLAttributes<HTMLSpanElement> & { asChild?: boolean }) {
  return <span {...p}>{children}</span>;
}
export function DropdownMenuContent({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-2 min-w-[10rem] rounded-md border border-zinc-700 bg-zinc-900 p-1 text-sm text-zinc-100 shadow-xl', className)} {...p}>{children}</div>;
}
export function DropdownMenuItem({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return <div className={cn('rounded px-2 py-1.5 hover:bg-zinc-800', className)} {...p}>{children}</div>;
}
export function DropdownMenuCheckboxItem({ children }: { children?: React.ReactNode }) {
  return <div className="rounded px-2 py-1.5 hover:bg-zinc-800">{children}</div>;
}
export function DropdownMenuRadioItem({ children }: { children?: React.ReactNode }) {
  return <div className="rounded px-2 py-1.5 hover:bg-zinc-800">{children}</div>;
}
export function DropdownMenuLabel({ children }: { children?: React.ReactNode }) {
  return <div className="px-2 py-1.5 text-xs text-zinc-500">{children}</div>;
}
export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-zinc-800" />;
}
export function DropdownMenuShortcut({ children }: { children?: React.ReactNode }) {
  return <span className="ml-auto text-xs text-zinc-500">{children}</span>;
}
export function DropdownMenuGroup({ children }: { children?: React.ReactNode }) { return <div>{children}</div>; }
export function DropdownMenuPortal({ children }: { children?: React.ReactNode }) { return <>{children}</>; }
export function DropdownMenuSub({ children }: { children?: React.ReactNode }) { return <div>{children}</div>; }
export function DropdownMenuSubContent({ children }: { children?: React.ReactNode }) { return <div>{children}</div>; }
export function DropdownMenuSubTrigger({ children }: { children?: React.ReactNode }) { return <div>{children}</div>; }
export function DropdownMenuRadioGroup({ children }: { children?: React.ReactNode }) { return <div>{children}</div>; }
`;

const COMMAND = `import * as React from 'react';
import { cn } from '../../lib/utils';

export function Command({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 text-zinc-100', className)} {...p}>{children}</div>;
}
export function CommandDialog({ children }: { children?: React.ReactNode }) { return <div>{children}</div>; }
export function CommandInput({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('h-9 border-b border-zinc-800 bg-transparent px-3 text-sm outline-none placeholder:text-zinc-500', className)} {...p} />;
}
export function CommandList({ children }: { children?: React.ReactNode }) { return <div className="max-h-72 overflow-auto p-1">{children}</div>; }
export function CommandEmpty({ children }: { children?: React.ReactNode }) { return <div className="py-6 text-center text-sm text-zinc-500">{children}</div>; }
export function CommandGroup({ children }: { children?: React.ReactNode }) { return <div className="p-1">{children}</div>; }
export function CommandItem({ children, ...p }: React.HTMLAttributes<HTMLDivElement> & { value?: string; onSelect?: (v: string) => void }) {
  return <div className="rounded px-2 py-1.5 hover:bg-zinc-800" {...p}>{children}</div>;
}
export function CommandShortcut({ children }: { children?: React.ReactNode }) { return <span className="ml-auto text-xs text-zinc-500">{children}</span>; }
export function CommandSeparator() { return <div className="my-1 h-px bg-zinc-800" />; }
`;

/** path (sandbox root) -> source. `@/x` in component source is rewritten to `./x`. */
export const SANDBOX_SHIM_FILES: Record<string, string> = {
  '/lib/utils.ts': UTILS,
  '/components/ui/button.tsx': BUTTON,
  '/components/ui/input.tsx': INPUT,
  '/components/ui/textarea.tsx': TEXTAREA,
  '/components/ui/label.tsx': LABEL,
  '/components/ui/badge.tsx': BADGE,
  '/components/ui/separator.tsx': SEPARATOR,
  '/components/ui/card.tsx': CARD,
  '/components/ui/popover.tsx': POPOVER,
  '/components/ui/hover-card.tsx': HOVER_CARD,
  '/components/ui/tooltip.tsx': TOOLTIP,
  '/components/ui/collapsible.tsx': COLLAPSIBLE,
  '/components/ui/scroll-area.tsx': SCROLL_AREA,
  '/components/ui/select.tsx': SELECT,
  '/components/ui/dropdown-menu.tsx': DROPDOWN,
  '/components/ui/command.tsx': COMMAND,
};
