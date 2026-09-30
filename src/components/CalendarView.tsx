import { useEffect, useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { Navbar } from './Navbar';
import { academicCalendarPdfPage, ACADEMIC_CALENDAR_PDF_PATH } from '../utils/academicCalendarPdf';
import type { AppView } from '../utils/appLocation';
import type { ThemeMode } from '../hooks/useSchedule';

export function CalendarView({ setView, darkMode, themePreference, cycleTheme }: {
  setView: (view: AppView) => void; darkMode: boolean; themePreference: ThemeMode; cycleTheme: () => void;
}) {
  const [page, setPage] = useState(() => academicCalendarPdfPage());
  useEffect(() => {
    const refresh = () => { if (!document.hidden) setPage(academicCalendarPdfPage()); };
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const source = `${ACADEMIC_CALENDAR_PDF_PATH}#page=${page}&view=FitH`;
  return <div className="h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
    <Navbar setView={setView} title="Calendário acadêmico" course={null} darkMode={darkMode} themePreference={themePreference} cycleTheme={cycleTheme} />
    <main className="w-full max-w-7xl mx-auto flex flex-col flex-1 min-h-0 p-3 sm:p-6 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div><h1 className="text-lg sm:text-2xl font-bold">Calendário acadêmico da UFAPE</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">PDF oficial · abertura no mês atual · horário de Brasília</p></div>
        <div className="flex flex-wrap gap-2">
          <a href={source} target="_blank" rel="noopener noreferrer" className="admin-secondary inline-flex items-center gap-2 text-sm"><ExternalLink size={16} />Abrir em nova aba</a>
          <a href={ACADEMIC_CALENDAR_PDF_PATH} download className="admin-secondary inline-flex items-center gap-2 text-sm"><Download size={16} />Baixar PDF</a>
        </div>
      </div>
      <iframe src={source} title="Calendário acadêmico da UFAPE em PDF" className="w-full flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white" />
    </main>
  </div>;
}
