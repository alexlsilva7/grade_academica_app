import { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { Navbar } from './Navbar';
import { academicCalendarPdfUrl } from '../utils/academicCalendarPdf';
import type { AppView } from '../utils/appLocation';
import type { ThemeMode } from '../hooks/useSchedule';

export function CalendarView({ setView, darkMode, themePreference, cycleTheme }: {
  setView: (view: AppView) => void; darkMode: boolean; themePreference: ThemeMode; cycleTheme: () => void;
}) {
  useEffect(() => { window.location.replace(academicCalendarPdfUrl()); }, []);
  return <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
    <Navbar setView={setView} title="Calendário acadêmico" course={null} darkMode={darkMode} themePreference={themePreference} cycleTheme={cycleTheme} />
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold">Calendário acadêmico da UFAPE</h1>
      <p role="status" className="mt-3 text-slate-500">Abrindo o PDF na página do mês atual…</p>
      <a href={academicCalendarPdfUrl()} className="admin-primary inline-flex items-center gap-2 mt-6"><ExternalLink size={16} />Abrir calendário em PDF</a>
    </main>
  </div>;
}
