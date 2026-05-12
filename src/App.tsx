import { useSchedule } from './hooks/useSchedule';
import { HomeView } from './components/HomeView';
import { Sidebar } from './components/Sidebar';
import { ScheduleGrid } from './components/ScheduleGrid';
import { MobileNav } from './components/MobileNav';
import { DisciplineDetailsModal } from './components/DisciplineDetailsModal';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const scheduleProps = useSchedule();

  if (scheduleProps.view === 'home') {
    return (
      <HomeView 
        loadPredefinedGrade={scheduleProps.loadPredefinedGrade}
        handleFileUpload={scheduleProps.handleFileUpload}
        isProcessingPdf={scheduleProps.isProcessingPdf}
        hasApiKey={scheduleProps.hasApiKey}
      />
    );
  }

  return (
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
      />
      <ScheduleGrid 
        mobileTab={scheduleProps.mobileTab}
        schedule={scheduleProps.schedule}
        removeFromSchedule={scheduleProps.removeFromSchedule}
        onShowDetails={scheduleProps.setDetailsDiscipline}
      />
      {scheduleProps.conflictMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm px-4 py-3 bg-red-600 text-white rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium leading-tight">{scheduleProps.conflictMsg}</span>
        </div>
      )}
      
      {scheduleProps.detailsDiscipline && (
        <DisciplineDetailsModal 
          discipline={scheduleProps.detailsDiscipline}
          onClose={() => scheduleProps.setDetailsDiscipline(null)}
        />
      )}

      <MobileNav 
        mobileTab={scheduleProps.mobileTab}
        setMobileTab={scheduleProps.setMobileTab}
        schedule={scheduleProps.schedule}
      />
    </div>
  );
}
