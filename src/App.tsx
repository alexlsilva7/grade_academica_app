import { useSchedule } from './hooks/useSchedule';
import { HomeView } from './components/HomeView';
import { MatrizView } from './components/MatrizView';
import { DisciplinesView } from './components/DisciplinesView';
import { Sidebar } from './components/Sidebar';
import { ScheduleGrid } from './components/ScheduleGrid';
import { MobileNav } from './components/MobileNav';
import { DisciplineDetailsModal } from './components/DisciplineDetailsModal';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Navbar } from './components/Navbar';

export default function App() {
  const scheduleProps = useSchedule();

  return (
    <>
      {scheduleProps.view === 'home' ? (
        <HomeView 
          loadPredefinedGrade={scheduleProps.loadPredefinedGrade}
          setView={scheduleProps.setView}
          themePreference={scheduleProps.themePreference}
          cycleTheme={scheduleProps.cycleTheme}
          darkMode={scheduleProps.darkMode}
          selectedCourse={scheduleProps.selectedCourse}
          changeCourse={scheduleProps.changeCourse}
        />
      ) : scheduleProps.view === 'matriz' ? (
        <MatrizView 
          setView={scheduleProps.setView}
          course={scheduleProps.selectedCourse}
          darkMode={scheduleProps.darkMode}
          themePreference={scheduleProps.themePreference}
          cycleTheme={scheduleProps.cycleTheme}
          schedule={scheduleProps.schedule}
        />
      ) : scheduleProps.view === 'disciplines' ? (
        <DisciplinesView
          setView={scheduleProps.setView}
          course={scheduleProps.selectedCourse}
          darkMode={scheduleProps.darkMode}
          themePreference={scheduleProps.themePreference}
          cycleTheme={scheduleProps.cycleTheme}
        />
      ) : (
        <div className="h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex flex-col overflow-hidden animate-in fade-in duration-500">
          <Navbar 
            setView={scheduleProps.setView}
            title="Grade Horária"
            course={scheduleProps.selectedCourse}
            darkMode={scheduleProps.darkMode}
            themePreference={scheduleProps.themePreference}
            cycleTheme={scheduleProps.cycleTheme}
          />
          
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <Sidebar 
              mobileTab={scheduleProps.mobileTab}
              setView={scheduleProps.setView}
              gradeTitle={scheduleProps.gradeTitle}
              periods={scheduleProps.periods}
              selectedPeriod={scheduleProps.selectedPeriod}
              setSelectedPeriod={scheduleProps.setSelectedPeriod}
              searchQuery={scheduleProps.searchQuery}
              setSearchQuery={scheduleProps.setSearchQuery}
              disciplinesList={scheduleProps.disciplinesList}
              displayedDisciplines={scheduleProps.displayedDisciplines}
              isDisciplineScheduled={scheduleProps.isDisciplineScheduled}
              toggleDiscipline={scheduleProps.toggleDiscipline}
              onShowDetails={scheduleProps.setDetailsDiscipline}
              hasApiKey={scheduleProps.hasApiKey}
              completedDisciplines={scheduleProps.completedDisciplines}
              toggleCompleted={scheduleProps.toggleCompleted}
              getDisciplineConflictInstance={scheduleProps.getDisciplineConflictInstance}
              darkMode={scheduleProps.darkMode}
              themePreference={scheduleProps.themePreference}
              cycleTheme={scheduleProps.cycleTheme}
            />
            <ScheduleGrid 
              mobileTab={scheduleProps.mobileTab}
              schedule={scheduleProps.schedule}
              disciplinesList={scheduleProps.disciplinesList}
              removeFromSchedule={scheduleProps.removeFromSchedule}
              onShowDetails={scheduleProps.setDetailsDiscipline}
            />
          </div>
          
          {scheduleProps.detailsDiscipline && (
            <DisciplineDetailsModal 
              discipline={scheduleProps.detailsDiscipline}
              onClose={() => scheduleProps.setDetailsDiscipline(null)}
              completedDisciplines={scheduleProps.completedDisciplines}
              toggleCompleted={scheduleProps.toggleCompleted}
              getDisciplineConflictInstance={scheduleProps.getDisciplineConflictInstance}
            />
          )}

          <MobileNav 
            mobileTab={scheduleProps.mobileTab}
            setMobileTab={scheduleProps.setMobileTab}
            schedule={scheduleProps.schedule}
          />
        </div>
      )}

      {scheduleProps.conflictMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] w-[90%] max-w-sm px-4 py-3 bg-red-600 dark:bg-red-800 text-white rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium leading-tight">{scheduleProps.conflictMsg}</span>
        </div>
      )}

      {/* Global Processing Overlay */}
      {scheduleProps.isProcessingPdf && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center text-center animate-in zoom-in-95 duration-300 delay-100">
            <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Processando PDF</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              A Inteligência Artificial está lendo o documento e extraindo as disciplinas. Esse processo pode levar alguns segundos...
            </p>
          </div>
        </div>
      )}
    </>
  );
}
