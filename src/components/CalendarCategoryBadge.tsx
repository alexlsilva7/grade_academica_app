import { CALENDAR_CATEGORIES, type CalendarCategory } from '../calendarTypes';

export const calendarCategoryHighlights: Partial<Record<CalendarCategory, { badge: string; border: string; dot: string }>> = {
  matricula: { badge: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200', border: 'border-l-4 border-l-blue-500 dark:border-l-blue-400', dot: 'bg-blue-500' },
  reajuste: { badge: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200', border: 'border-l-4 border-l-amber-500 dark:border-l-amber-400', dot: 'bg-amber-500' },
  feriado: { badge: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200', border: 'border-l-4 border-l-rose-500 dark:border-l-rose-400', dot: 'bg-rose-500' }
};

export function CalendarCategoryBadge({ category }: { category: CalendarCategory }) {
  const highlight = calendarCategoryHighlights[category];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${highlight?.badge || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{CALENDAR_CATEGORIES[category]}</span>;
}
