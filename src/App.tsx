import { useSchedule } from './hooks/useSchedule';
import { HomeView } from './components/HomeView';
import { Sidebar } from './components/Sidebar';
import { ScheduleGrid } from './components/ScheduleGrid';
import { MobileNav } from './components/MobileNav';
import { DisciplineDetailsModal } from './components/DisciplineDetailsModal';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function App() {
  const scheduleProps = useSchedule();

  return (
    <>
      {scheduleProps.view === 'home' ? (
        <HomeView 
          loadPredefinedGrade={scheduleProps.loadPredefinedGrade}
          handleFileUpload={scheduleProps.handleFileUpload}
          isProcessingPdf={scheduleProps.isProcessingPdf}
          hasApiKey={scheduleProps.hasApiKey}
          savedGrades={scheduleProps.savedGrades}
          loadSavedGrade={scheduleProps.loadSavedGrade}
          removeSavedGrade={scheduleProps.removeSavedGrade}
        />
      ) : (
        <div className="h-[100dvh] bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-500">
          <Sidebar 
            mobileTab={scheduleProps.mobileTab}
            setView={scheduleProps.setView}
            gradeTitle={scheduleProps.gradeTitle}
            fileInputRef={scheduleProps.fileInputRef}
            handleFileUpload={scheduleProps.handleFileUpload}
            isProcessingPdf={scheduleProps.isProcessingPdf}
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
          />
          <ScheduleGrid 
            mobileTab={scheduleProps.mobileTab}
            schedule={scheduleProps.schedule}
            disciplinesList={scheduleProps.disciplinesList}
            removeFromSchedule={scheduleProps.removeFromSchedule}
            onShowDetails={scheduleProps.setDetailsDiscipline}
          />
          
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
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] w-[90%] max-w-sm px-4 py-3 bg-red-600 text-white rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium leading-tight">{scheduleProps.conflictMsg}</span>
        </div>
      )}

      {/* Global Processing Overlay */}
      {scheduleProps.isProcessingPdf && (
        <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center text-center animate-in zoom-in-95 duration-300 delay-100">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">Processando PDF</h3>
            <p className="text-sm text-slate-500">
              A Inteligência Artificial está lendo o documento e extraindo as disciplinas. Esse processo pode levar alguns segundos...
            </p>
          </div>
        </div>
      )}
    </>
  );
}
