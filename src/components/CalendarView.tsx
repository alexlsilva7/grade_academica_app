import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Download } from 'lucide-react';
import { Navbar } from './Navbar';
import { CalendarImageViewer } from './CalendarImageViewer';
import { academicCalendarPdfPage, ACADEMIC_CALENDAR_PDF_PATH } from '../utils/academicCalendarPdf';
import type { AppView } from '../utils/appLocation';
import type { ThemeMode } from '../hooks/useSchedule';

export function CalendarView({ setView, darkMode, themePreference, cycleTheme }: {
  setView: (view: AppView) => void; darkMode: boolean; themePreference: ThemeMode; cycleTheme: () => void;
}) {
  const [page, setPage] = useState(() => academicCalendarPdfPage());
  const currentMonthPage = useRef(page);
  useEffect(() => {
    const refresh = () => {
      if (document.hidden) return;
      const nextPage = academicCalendarPdfPage();
      if (nextPage !== currentMonthPage.current) {
        currentMonthPage.current = nextPage;
        setPage(nextPage);
      }
    };
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  return <div className="h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
    <Navbar setView={setView} title="Calendário acadêmico" course={null} darkMode={darkMode} themePreference={themePreference} cycleTheme={cycleTheme} />
    <main className="w-full max-w-7xl mx-auto flex flex-col flex-1 min-h-0 p-3 sm:p-6 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div><h1 className="text-base sm:text-2xl font-bold">Calendário acadêmico da UFAPE</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Abertura no mês atual · horário de Brasília</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setPage(academicCalendarPdfPage())} className="admin-secondary inline-flex items-center gap-2 text-sm"><CalendarDays size={16} />Mês atual</button>
          <a href={ACADEMIC_CALENDAR_PDF_PATH} download className="admin-secondary inline-flex items-center gap-2 text-sm"><Download size={16} />Baixar PDF</a>
        </div>
      </div>
      <CalendarImageViewer page={page} onPageChange={setPage} />
    </main>
  </div>;
}
