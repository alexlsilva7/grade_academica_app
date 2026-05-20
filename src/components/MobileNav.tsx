import { BookOpen, Calendar } from 'lucide-react';
import { Discipline } from '../types';

interface MobileNavProps {
  mobileTab: 'disciplines' | 'schedule';
  setMobileTab: (tab: 'disciplines' | 'schedule') => void;
  schedule: Discipline[];
}

export function MobileNav({ mobileTab, setMobileTab, schedule }: MobileNavProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex h-[60px] pb-safe z-50">
      <button
        onClick={() => setMobileTab('disciplines')}
        className={`flex-1 flex flex-col items-center justify-center gap-1 ${mobileTab === 'disciplines' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
      >
        <BookOpen className={`w-5 h-5 ${mobileTab === 'disciplines' ? 'fill-indigo-50 dark:fill-indigo-950/50' : ''}`} />
        <span className="text-[10px] font-semibold">Disciplinas</span>
      </button>
      <button
        onClick={() => setMobileTab('schedule')}
        className={`flex-1 flex flex-col items-center justify-center gap-1 relative ${mobileTab === 'schedule' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
      >
        <Calendar className={`w-5 h-5 ${mobileTab === 'schedule' ? 'fill-indigo-50 dark:fill-indigo-950/50' : ''}`} />
        <span className="text-[10px] font-semibold">Sua Grade</span>
        {schedule.length > 0 && (
          <span className="absolute top-1 right-1/4 w-2 h-2 bg-indigo-500 rounded-full" />
        )}
      </button>
    </div>
  );
}
