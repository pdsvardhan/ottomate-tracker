// Extra @/ shims (iter-77 item 272) beyond the base set in base-shims.ts.
// Each value is TSX source written to preview-sandbox/shims/<path> and resolved
// by the esbuild alias plugin. These are lightweight, API-compatible stand-ins —
// the bar is "renders without crashing and looks plausible", not pixel fidelity.
// Overlay primitives (dialog/sheet/drawer) render their content INLINE so the
// preview shows something instead of a closed-by-default void.

const ICONS = `export * from 'lucide-react';\nimport * as L from 'lucide-react';\nexport const Icons = L;\nexport default L;\n`;
const USE_ON_RESIZE = `export function useOnWindowResize(_cb){}\nexport default useOnWindowResize;\n`;
const USE_MOBILE = `export function useIsMobile(){ return false; }\nexport function useMobile(){ return false; }\nexport default useIsMobile;\n`;
const TYPES = `export {};\n`;
const SHOW_SUBMITTED = `export function showSubmittedData(){}\nexport default showSubmittedData;\n`;
const FORMAT = `export const formatDate=(d)=>String(d??'');\nexport const formatNumber=(n)=>new Intl.NumberFormat().format(Number(n)||0);\nexport const formatCurrency=(n)=>'$'+(Number(n)||0).toLocaleString();\nexport const format=(v)=>String(v??'');\nexport default { formatDate, formatNumber, formatCurrency };\n`;
const CHART_UTILS = `// best-effort tremor chartUtils stand-in
export const AvailableChartColors = ['blue','cyan','emerald','violet','amber','rose','indigo','lime'];
export const chartColors = AvailableChartColors;
const PALETTE = { blue:'#3b82f6', cyan:'#22d3ee', emerald:'#10b981', violet:'#8b5cf6', amber:'#f59e0b', rose:'#f43f5e', indigo:'#6366f1', lime:'#84cc16', gray:'#71717a' };
export function constructCategoryColors(categories=[], colors=AvailableChartColors){ const m=new Map(); categories.forEach((c,i)=>m.set(c, colors[i%colors.length])); return m; }
export function getColorClassName(color){ return ''; }
export const getColor = (c)=> PALETTE[c] || PALETTE.cyan;
export function getYAxisDomain(){ return [0,'auto']; }
export function hasOnlyOneValueForKey(){ return false; }
export const cx = (...a)=>a.filter(Boolean).join(' ');
export default { AvailableChartColors, constructCategoryColors, getColorClassName, getColor };
`;

const FORM = `import * as React from 'react';
export function Form({ children }){ return React.createElement(React.Fragment, null, children); }
export function FormField({ render }){ return render ? render({ field: { value: '', onChange(){}, onBlur(){}, name: '', ref(){} }, fieldState: {}, formState: {} }) : null; }
export function FormItem({ children }){ return React.createElement('div', { className: 'space-y-1.5' }, children); }
export function FormLabel({ children }){ return React.createElement('label', { className: 'text-sm font-medium text-zinc-200' }, children); }
export function FormControl({ children }){ return React.createElement(React.Fragment, null, children); }
export function FormDescription({ children }){ return React.createElement('p', { className: 'text-xs text-zinc-500' }, children); }
export function FormMessage({ children }){ return children ? React.createElement('p', { className: 'text-xs text-rose-400' }, children) : null; }
export function useFormField(){ return { id: 'f', name: '', formItemId: 'f', error: undefined }; }
`;

// Generic passthrough factory: components that just render their children.
const pass = (names, tag = 'div', cls = '') =>
  `import * as React from 'react';\n` +
  names.map((n) => `export function ${n}({ children, className, ...p }: any){ return React.createElement('${tag}', { className: ['${cls}', className].filter(Boolean).join(' '), ...p }, children); }`).join('\n') + '\n';

const AVATAR = `import * as React from 'react';
export function Avatar({ children, className }: any){ return React.createElement('span', { className: ['inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-zinc-700 text-zinc-100', className].filter(Boolean).join(' ') }, children); }
export function AvatarImage({ src, alt }: any){ return src ? React.createElement('img', { src, alt, className: 'h-full w-full object-cover' }) : null; }
export function AvatarFallback({ children }: any){ return React.createElement('span', { className: 'text-xs' }, children); }
`;
const TABLE = `import * as React from 'react';
const C = (tag, cls) => ({ children, className, ...p }: any) => React.createElement(tag, { className: [cls, className].filter(Boolean).join(' '), ...p }, children);
export const Table = C('table', 'w-full text-sm text-zinc-200 border-collapse');
export const TableHeader = C('thead', 'text-zinc-400');
export const TableBody = C('tbody', '');
export const TableFooter = C('tfoot', '');
export const TableRow = C('tr', 'border-b border-zinc-800');
export const TableHead = C('th', 'px-3 py-2 text-left font-medium');
export const TableCell = C('td', 'px-3 py-2');
export const TableCaption = C('caption', 'text-zinc-500 py-2');
`;
const PROGRESS = `import * as React from 'react';
export function Progress({ value = 60, className }: any){ return React.createElement('div', { className: ['h-2 w-48 overflow-hidden rounded-full bg-zinc-800', className].filter(Boolean).join(' ') }, React.createElement('div', { className: 'h-full rounded-full bg-cyan-400', style: { width: (value||60) + '%' } })); }
export default Progress;
`;
const SKELETON = `import * as React from 'react';
export function Skeleton({ className }: any){ return React.createElement('div', { className: ['animate-pulse rounded-md bg-zinc-800 h-6 w-40', className].filter(Boolean).join(' ') }); }
export default Skeleton;
`;
const DIALOGISH = (names) => `import * as React from 'react';
export function ${names.root}({ children }: any){ return React.createElement('div', { className: 'inline-block' }, children); }
export function ${names.trigger}({ children, asChild, ...p }: any){ return React.createElement('span', p, children); }
export function ${names.content}({ children, className }: any){ return React.createElement('div', { className: ['rounded-lg border border-zinc-700 bg-zinc-900 p-5 text-zinc-100 shadow-xl max-w-md', className].filter(Boolean).join(' ') }, children); }
export function ${names.header}({ children }: any){ return React.createElement('div', { className: 'mb-2 space-y-1' }, children); }
export function ${names.footer}({ children }: any){ return React.createElement('div', { className: 'mt-4 flex justify-end gap-2' }, children); }
export function ${names.title}({ children }: any){ return React.createElement('h3', { className: 'text-base font-semibold' }, children); }
export function ${names.desc}({ children }: any){ return React.createElement('p', { className: 'text-sm text-zinc-400' }, children); }
export function ${names.close}({ children }: any){ return React.createElement('span', null, children); }
${names.portal ? `export function ${names.portal}({ children }: any){ return React.createElement(React.Fragment, null, children); }\nexport function ${names.overlay}(){ return null; }` : ''}
`;
const CAROUSEL = `import * as React from 'react';
export function Carousel({ children, className }: any){ return React.createElement('div', { className: ['relative', className].filter(Boolean).join(' ') }, children); }
export function CarouselContent({ children, className }: any){ return React.createElement('div', { className: ['flex gap-3 overflow-hidden', className].filter(Boolean).join(' ') }, children); }
export function CarouselItem({ children, className }: any){ return React.createElement('div', { className: ['shrink-0', className].filter(Boolean).join(' ') }, children); }
export function CarouselPrevious(){ return null; }
export function CarouselNext(){ return null; }
`;
const SLIDER = `import * as React from 'react';
export function Slider({ className, defaultValue = [50], min = 0, max = 100 }: any){ return React.createElement('input', { type: 'range', min, max, defaultValue: (defaultValue && defaultValue[0]) ?? 50, className: ['w-48 accent-cyan-400', className].filter(Boolean).join(' ') }); }
export default Slider;
`;
const INPUT_OTP = `import * as React from 'react';
export function InputOTP({ children }: any){ return React.createElement('div', { className: 'flex gap-2' }, children || [0,1,2,3].map((i)=>React.createElement('div',{key:i,className:'h-10 w-10 rounded-md border border-zinc-700 bg-zinc-900'}))); }
export function InputOTPGroup({ children }: any){ return React.createElement('div', { className: 'flex gap-2' }, children); }
export function InputOTPSlot({ index }: any){ return React.createElement('div', { className: 'flex h-10 w-10 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-100' }, ''); }
export function InputOTPSeparator(){ return React.createElement('span', { className: 'text-zinc-600' }, '-'); }
`;
const CALENDAR = `import * as React from 'react';
export function Calendar({ className }: any){ return React.createElement('div', { className: ['grid grid-cols-7 gap-1 p-3 rounded-lg border border-zinc-700 bg-zinc-900', className].filter(Boolean).join(' ') }, Array.from({length:28},(_,i)=>React.createElement('div',{key:i,className:'h-7 w-7 flex items-center justify-center text-xs text-zinc-300 rounded hover:bg-zinc-800'}, i+1))); }
export default Calendar;
`;
const TABS = `import * as React from 'react';
export function Tabs({ children, className }: any){ return React.createElement('div', { className }, children); }
export function TabsList({ children, className }: any){ return React.createElement('div', { className: ['inline-flex gap-1 rounded-lg bg-zinc-800/60 p-1', className].filter(Boolean).join(' ') }, children); }
export function TabsTrigger({ children, className }: any){ return React.createElement('button', { className: ['rounded-md px-3 py-1.5 text-sm text-zinc-200', className].filter(Boolean).join(' ') }, children); }
export function TabsContent({ children, className }: any){ return React.createElement('div', { className: ['pt-3', className].filter(Boolean).join(' ') }, children); }
`;
const ACCORDION = `import * as React from 'react';
export function Accordion({ children, className }: any){ return React.createElement('div', { className: ['divide-y divide-zinc-800 rounded-lg border border-zinc-800', className].filter(Boolean).join(' ') }, children); }
export function AccordionItem({ children, className }: any){ return React.createElement('div', { className }, children); }
export function AccordionTrigger({ children, className }: any){ return React.createElement('div', { className: ['px-4 py-3 font-medium text-zinc-100', className].filter(Boolean).join(' ') }, children); }
export function AccordionContent({ children, className }: any){ return React.createElement('div', { className: ['px-4 pb-3 text-sm text-zinc-400', className].filter(Boolean).join(' ') }, children); }
`;
const CHECKBOX = `import * as React from 'react';
export function Checkbox({ className, ...p }: any){ return React.createElement('input', { type: 'checkbox', defaultChecked: true, className: ['h-4 w-4 accent-cyan-400', className].filter(Boolean).join(' '), ...p }); }
export default Checkbox;
`;
const SWITCH = `import * as React from 'react';
export function Switch({ className }: any){ return React.createElement('span', { className: ['inline-flex h-6 w-11 items-center rounded-full bg-cyan-500/70 p-0.5', className].filter(Boolean).join(' ') }, React.createElement('span', { className: 'h-5 w-5 translate-x-5 rounded-full bg-white block transition' })); }
export default Switch;
`;
const RADIO = `import * as React from 'react';
export function RadioGroup({ children, className }: any){ return React.createElement('div', { className: ['flex flex-col gap-2', className].filter(Boolean).join(' ') }, children); }
export function RadioGroupItem({ className }: any){ return React.createElement('span', { className: ['inline-block h-4 w-4 rounded-full border border-zinc-500', className].filter(Boolean).join(' ') }); }
`;
const INPUT_GROUP = pass(['InputGroup', 'InputGroupAddon', 'InputGroupInput', 'InputGroupText', 'InputGroupButton'], 'div', 'flex items-center gap-2');

export const EXTRA_SHIMS = {
  '/components/icons.tsx': ICONS,
  '/lib/useOnWindowResize.ts': USE_ON_RESIZE,
  '/hooks/use-mobile.ts': USE_MOBILE,
  '/lib/types.ts': TYPES,
  '/lib/show-submitted-data.ts': SHOW_SUBMITTED,
  '/lib/format.ts': FORMAT,
  '/lib/chartUtils.ts': CHART_UTILS,
  '/components/ui/form.tsx': FORM,
  '/components/ui/avatar.tsx': AVATAR,
  '/components/ui/table.tsx': TABLE,
  '/components/ui/progress.tsx': PROGRESS,
  '/components/ui/skeleton.tsx': SKELETON,
  '/components/ui/dialog.tsx': DIALOGISH({ root: 'Dialog', trigger: 'DialogTrigger', content: 'DialogContent', header: 'DialogHeader', footer: 'DialogFooter', title: 'DialogTitle', desc: 'DialogDescription', close: 'DialogClose', portal: 'DialogPortal', overlay: 'DialogOverlay' }),
  '/components/ui/sheet.tsx': DIALOGISH({ root: 'Sheet', trigger: 'SheetTrigger', content: 'SheetContent', header: 'SheetHeader', footer: 'SheetFooter', title: 'SheetTitle', desc: 'SheetDescription', close: 'SheetClose', portal: 'SheetPortal', overlay: 'SheetOverlay' }),
  '/components/ui/drawer.tsx': DIALOGISH({ root: 'Drawer', trigger: 'DrawerTrigger', content: 'DrawerContent', header: 'DrawerHeader', footer: 'DrawerFooter', title: 'DrawerTitle', desc: 'DrawerDescription', close: 'DrawerClose', portal: 'DrawerPortal', overlay: 'DrawerOverlay' }),
  '/components/ui/carousel.tsx': CAROUSEL,
  '/components/ui/slider.tsx': SLIDER,
  '/components/ui/input-otp.tsx': INPUT_OTP,
  '/components/ui/calendar.tsx': CALENDAR,
  '/components/ui/tabs.tsx': TABS,
  '/components/ui/accordion.tsx': ACCORDION,
  '/components/ui/checkbox.tsx': CHECKBOX,
  '/components/ui/switch.tsx': SWITCH,
  '/components/ui/radio-group.tsx': RADIO,
  '/components/ui/input-group.tsx': INPUT_GROUP,
};
