import { calendarToday } from './academicCalendar';

export const ACADEMIC_CALENDAR_PDF_PATH = '/documents/calendario-academico-ufape-2026.pdf';

// Main monthly tables in this edition. Pages 4 and 10 continue May and October.
const monthlyPages = [
  ['2026-03', 1], ['2026-04', 2], ['2026-05', 3], ['2026-06', 5],
  ['2026-07', 6], ['2026-08', 7], ['2026-09', 8], ['2026-10', 9],
  ['2026-11', 11], ['2026-12', 12], ['2027-01', 13], ['2027-02', 14],
  ['2027-03', 15], ['2027-04', 16]
] as const;

export function academicCalendarPdfPage(now = new Date()): number {
  const month = calendarToday(now).slice(0, 7);
  // Outside this edition's coverage, open its nearest available monthly table.
  return monthlyPages.find(([coveredMonth]) => month <= coveredMonth)?.[1] || 16;
}

export function academicCalendarPdfUrl(now = new Date()): string {
  return `${ACADEMIC_CALENDAR_PDF_PATH}#page=${academicCalendarPdfPage(now)}`;
}
