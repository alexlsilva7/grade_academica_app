import { lazy, Suspense, useState, useEffect } from 'react';
import { useSchedule } from './hooks/useSchedule';
import { HomeView } from './components/HomeView';
import { AnimatePresence } from 'motion/react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { Navbar } from './components/Navbar';
import { canAccessAdmin } from './utils/domain';

const MatrizView = lazy(() => import('./components/MatrizView').then(module => ({ default: module.MatrizView })));
const DisciplinesView = lazy(() => import('./components/DisciplinesView').then(module => ({ default: module.DisciplinesView })));
const AdminView = lazy(() => import('./components/AdminView').then(module => ({ default: module.AdminView })));
const CalendarView = lazy(() => import('./components/CalendarView').then(module => ({ default: module.CalendarView })));
const Sidebar = lazy(() => import('./components/Sidebar').then(module => ({ default: module.Sidebar })));
const ScheduleGrid = lazy(() => import('./components/ScheduleGrid').then(module => ({ default: module.ScheduleGrid })));
const MobileNav = lazy(() => import('./components/MobileNav').then(module => ({ default: module.MobileNav })));
const DisciplineDetailsModal = lazy(() => import('./components/DisciplineDetailsModal').then(module => ({ default: module.DisciplineDetailsModal })));
const ScheduleTour = lazy(() => import('./components/ScheduleTour').then(module => ({ default: module.ScheduleTour })));
const ScheduleImageModal = lazy(() => import('./components/ScheduleImageModal').then(module => ({ default: module.ScheduleImageModal })));
const AdminAccess = lazy(() => import('./components/admin/AdminAccess').then(module => ({ default: module.AdminAccess })));

function ViewLoading() {
  return <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500" role="status">Carregando tela…</div>;
}

export default function App() {
  const scheduleProps = useSchedule();
  const [isScheduleTourOpen, setIsScheduleTourOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Auto-abrir tutorial de horários na primeira visita à tela de grade
  useEffect(() => {
    if (scheduleProps.view === 'schedule') {
      const seen = localStorage.getItem('horario_tutorial_seen');
      if (!seen) {
        const timer = setTimeout(() => {
          setIsScheduleTourOpen(true);
        }, 700);
        return () => clearTimeout(timer);
      }
    }
  }, [scheduleProps.view]);

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
          selectedProfile={scheduleProps.selectedProfile}
          setSelectedProfile={scheduleProps.setSelectedProfile}
        />
      ) : scheduleProps.view === 'calendar' ? (
        <Suspense fallback={<ViewLoading />}>
          <CalendarView setView={scheduleProps.setView} darkMode={scheduleProps.darkMode}
            themePreference={scheduleProps.themePreference} cycleTheme={scheduleProps.cycleTheme} />
        </Suspense>
      ) : scheduleProps.view === 'matriz' ? (
        <Suspense fallback={<ViewLoading />}>
          <MatrizView
            setView={scheduleProps.setView}
            course={scheduleProps.selectedCourse}
            darkMode={scheduleProps.darkMode}
            themePreference={scheduleProps.themePreference}
            cycleTheme={scheduleProps.cycleTheme}
            schedule={scheduleProps.schedule}
            selectedProfile={scheduleProps.selectedProfile}
            setSelectedProfile={scheduleProps.setSelectedProfile}
          />
        </Suspense>
      ) : (scheduleProps.view === 'admin' && canAccessAdmin()) ? (
        <Suspense fallback={<ViewLoading />}>
          <AdminAccess onBack={() => scheduleProps.setView('home')}>
            <AdminView
              setView={scheduleProps.setView}
              setDisciplinesList={scheduleProps.setDisciplinesList}
              setGradeTitle={scheduleProps.setGradeTitle}
            />
          </AdminAccess>
        </Suspense>
      ) : scheduleProps.view === 'disciplines' ? (
        <Suspense fallback={<ViewLoading />}>
          <DisciplinesView
            setView={scheduleProps.setView}
            course={scheduleProps.selectedCourse}
            darkMode={scheduleProps.darkMode}
            themePreference={scheduleProps.themePreference}
            cycleTheme={scheduleProps.cycleTheme}
          />
        </Suspense>
      ) : (
        <Suspense fallback={<ViewLoading />}>
          <div className="h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex flex-col overflow-hidden animate-in fade-in duration-500">
          <Navbar 
            setView={scheduleProps.setView}
            title="Grade Horária"
            course={scheduleProps.selectedCourse}
            darkMode={scheduleProps.darkMode}
            themePreference={scheduleProps.themePreference}
            cycleTheme={scheduleProps.cycleTheme}
            showAcademicPeriod={true}
            semesters={scheduleProps.availableSemesters}
            selectedSemester={scheduleProps.selectedSemester}
            dataSources={scheduleProps.scheduleDataInfo?.sources}
            dataUpdatedAt={scheduleProps.scheduleDataInfo?.updatedAt}
            onSemesterChange={scheduleProps.handleSemesterChange}
            onExportImage={() => setIsImageModalOpen(true)}
          />
          
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <Sidebar 
              mobileTab={scheduleProps.mobileTab}
              setView={scheduleProps.setView}
              gradeTitle={scheduleProps.gradeTitle}
              periods={scheduleProps.periods}
              selectedPeriod={scheduleProps.selectedPeriod}
              setSelectedPeriod={scheduleProps.setSelectedPeriod}
              availableProfiles={scheduleProps.availableProfiles}
              selectedProfile={scheduleProps.selectedProfile}
              setSelectedProfile={scheduleProps.setSelectedProfile}
              searchQuery={scheduleProps.searchQuery}
              setSearchQuery={scheduleProps.setSearchQuery}
              disciplinesList={scheduleProps.disciplinesList}
              displayedDisciplines={scheduleProps.displayedDisciplines}
              isDisciplineScheduled={scheduleProps.isDisciplineScheduled}
              toggleDiscipline={scheduleProps.toggleDiscipline}
              onShowDetails={scheduleProps.setDetailsDiscipline}
              hasApiKey={scheduleProps.hasApiKey}
              isDisciplineCompleted={scheduleProps.isDisciplineCompleted}
              toggleCompleted={scheduleProps.toggleCompleted}
              getDisciplineConflictInstance={scheduleProps.getDisciplineConflictInstance}
              darkMode={scheduleProps.darkMode}
              themePreference={scheduleProps.themePreference}
              cycleTheme={scheduleProps.cycleTheme}
              onOpenTour={() => setIsScheduleTourOpen(true)}
              curriculum={scheduleProps.courseCurriculum}
              contents={scheduleProps.courseContents}
            />
            <ScheduleGrid 
              mobileTab={scheduleProps.mobileTab}
              schedule={scheduleProps.schedule}
              disciplinesList={scheduleProps.disciplinesList}
              removeFromSchedule={scheduleProps.removeFromSchedule}
              onShowDetails={scheduleProps.setDetailsDiscipline}
              onOpenTour={() => setIsScheduleTourOpen(true)}
              onExportImage={() => setIsImageModalOpen(true)}
              curriculum={scheduleProps.courseCurriculum}
              contents={scheduleProps.courseContents}
            />
          </div>
          
            <Suspense fallback={null}>
              <AnimatePresence>
                {scheduleProps.detailsDiscipline && (
                  <DisciplineDetailsModal
                    discipline={scheduleProps.detailsDiscipline}
                    onClose={() => scheduleProps.setDetailsDiscipline(null)}
                    isDisciplineCompleted={scheduleProps.isDisciplineCompleted}
                    toggleCompleted={scheduleProps.toggleCompleted}
                    getDisciplineConflictInstance={scheduleProps.getDisciplineConflictInstance}
                    curriculum={scheduleProps.courseCurriculum}
                    contents={scheduleProps.courseContents}
                  />
                )}
              </AnimatePresence>
            </Suspense>

          <MobileNav 
            mobileTab={scheduleProps.mobileTab}
            setMobileTab={scheduleProps.setMobileTab}
            schedule={scheduleProps.schedule}
          />

            {isScheduleTourOpen && <ScheduleTour
              isOpen={isScheduleTourOpen}
              onClose={() => setIsScheduleTourOpen(false)}
              setMobileTab={scheduleProps.setMobileTab}
            />}

            {isImageModalOpen && <ScheduleImageModal
              isOpen={isImageModalOpen}
              onClose={() => setIsImageModalOpen(false)}
              course={scheduleProps.selectedCourse}
              semester={scheduleProps.selectedSemester || "2026.1"}
              schedule={scheduleProps.schedule}
              disciplinesList={scheduleProps.disciplinesList}
            />}
          </div>
        </Suspense>
      )}

      {scheduleProps.view === 'schedule' && scheduleProps.isScheduleLoading && (
        <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[250] rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          Carregando horário…
        </div>
      )}
      {scheduleProps.view === 'schedule' && scheduleProps.scheduleLoadError && (
        <div role="alert" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[250] flex max-w-[min(92vw,36rem)] items-center gap-3 rounded-xl bg-rose-700 px-4 py-3 text-sm text-white shadow-xl">
          <span>{scheduleProps.scheduleLoadError}</span>
          <button className="shrink-0 underline underline-offset-2" onClick={() => {
            if (scheduleProps.selectedCourse) void scheduleProps.loadCourseSchedule(scheduleProps.selectedCourse, scheduleProps.selectedSemester);
          }}>Tentar novamente</button>
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

      <Analytics />
    </>
  );
}
