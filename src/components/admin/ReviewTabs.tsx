import React from 'react';
import { Network, Code, Search, Plus } from 'lucide-react';
import { Discipline, CurriculumSubject, CurriculumProfile, TreeSubjectNode, DayOfWeek } from '../../types';
import { ReviewTableTab } from './ReviewTableTab';
import { ReviewTreeTab } from './ReviewTreeTab';
import { ReviewVisualTab } from './ReviewVisualTab';
import { ReviewJsonTab } from './ReviewJsonTab';

export type ReviewTabType = 'table' | 'visual' | 'tree' | 'json';

export interface ReviewTabsProps {
  section: 'schedule' | 'catalog' | 'structure' | 'import';
  resultRef: React.RefObject<HTMLDivElement | null>;
  reviewTab: ReviewTabType;
  setReviewTab: (tab: ReviewTabType) => void;
  activeMode: 'curriculum' | 'schedule';
  extractedTreeSubjects: TreeSubjectNode[];
  schemaValidation: {
    isValid: boolean;
    issues: string[];
  };
  searchFilter: string;
  setSearchFilter: (v: string) => void;
  activeProfiles: string[];
  filterProfile: string;
  setFilterProfile: (v: string) => void;
  filterPeriod: string;
  setFilterPeriod: (v: string) => void;
  onAddBlankItem: () => void;

  // Table Tab Props
  curriculumSubjects: CurriculumSubject[];
  filteredCurriculum: CurriculumSubject[];
  disciplines: Discipline[];
  filteredSchedule: Discipline[];
  days: { id: DayOfWeek; name: string }[];
  onStartEditCurriculum: (index: number, sub: CurriculumSubject) => void;
  onDeleteCurriculumItem: (index: number) => void;
  onStartEditSchedule: (index: number, disc: Discipline) => void;
  onDeleteScheduleItem: (index: number) => void;

  // Tree Tab Props
  courseProfiles: CurriculumProfile[];
  extractedProfile: CurriculumProfile | null;
  onSelectProfileToReview: (profileId: string) => void;
  onAddNewProfile: () => void;
  onRequestDeleteProfile: (profile: CurriculumProfile) => void;
  onStartEditProfileMeta: () => void;
  selectedTreePeriod: number | 'all';
  setSelectedTreePeriod: (period: number | 'all') => void;
  treeSearch: string;
  setTreeSearch: (search: string) => void;
  onAddBlankTreeNode: () => void;
  onOpenMatrizView: () => void;
  onStartEditTreeNode: (index: number, node: TreeSubjectNode) => void;
  onDeleteTreeNode: (index: number) => void;

  // Visual Tab Props
  selectedPreviewPeriod: number | 'all';
  setSelectedPreviewPeriod: (period: number | 'all') => void;
  availableTimeSlots: string[];

  // JSON Tab Props
  copied: boolean;
  onCopyJson: () => void;
  onApplyJsonEdit: () => void;
  jsonError: string | null;
  jsonText: string;
  setJsonText: (text: string) => void;
}

export function ReviewTabs({
  section,
  resultRef,
  reviewTab,
  setReviewTab,
  activeMode,
  extractedTreeSubjects,
  schemaValidation,
  searchFilter,
  setSearchFilter,
  activeProfiles,
  filterProfile,
  setFilterProfile,
  filterPeriod,
  setFilterPeriod,
  onAddBlankItem,

  // Table Tab
  curriculumSubjects,
  filteredCurriculum,
  disciplines,
  filteredSchedule,
  days,
  onStartEditCurriculum,
  onDeleteCurriculumItem,
  onStartEditSchedule,
  onDeleteScheduleItem,

  // Tree Tab
  courseProfiles,
  extractedProfile,
  onSelectProfileToReview,
  onAddNewProfile,
  onRequestDeleteProfile,
  onStartEditProfileMeta,
  selectedTreePeriod,
  setSelectedTreePeriod,
  treeSearch,
  setTreeSearch,
  onAddBlankTreeNode,
  onOpenMatrizView,
  onStartEditTreeNode,
  onDeleteTreeNode,

  // Visual Tab
  selectedPreviewPeriod,
  setSelectedPreviewPeriod,
  availableTimeSlots,

  // JSON Tab
  copied,
  onCopyJson,
  onApplyJsonEdit,
  jsonError,
  jsonText,
  setJsonText
}: ReviewTabsProps) {
  return (
    <div ref={resultRef} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      {(section === 'schedule' || section === 'catalog') && <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {section === 'schedule' && <div className="flex items-center gap-2" aria-label="Visualização da oferta">
          {(['table', 'visual'] as const).map(tab => <button key={tab} aria-pressed={reviewTab === tab} onClick={() => setReviewTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${reviewTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{tab === 'table' ? 'Lista' : 'Grade'}</button>)}
        </div>}

        {/* Search and Period filters */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar por nome ou código..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-8 pr-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none w-44 sm:w-56"
            />
          </div>

          {/* Profile selector if activeProfiles.length > 0 */}
          {activeProfiles.length > 0 && (
            <select
              value={filterProfile}
              onChange={(e) => setFilterProfile(e.target.value)}
              className="py-1 px-2 text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800 rounded-lg focus:outline-none cursor-pointer"
              title="Filtrar por Perfil Curricular / Matriz"
            >
              <option value="all">Todos Perfis ({activeProfiles.length})</option>
              {activeProfiles.map(p => (
                <option key={p} value={p}>Perfil: {p}</option>
              ))}
            </select>
          )}

          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="py-1 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">Todos Períodos</option>
            {Array.from({ length: 9 }, (_, i) => (
              <option key={i + 1} value={(i + 1).toString()}>
                {i + 1}º Período
              </option>
            ))}
            <option value="Optativa">Optativas</option>
          </select>

          <button
            type="button"
            onClick={onAddBlankItem}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-bold hover:opacity-90 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{activeMode === 'schedule' ? 'Nova turma' : 'Nova disciplina'}</span>
          </button>
        </div>
      </div>}

      {/* TAB 1: TABLE */}
      {reviewTab === 'table' && (
        <ReviewTableTab
          activeMode={activeMode}
          activeProfiles={activeProfiles}
          filterProfile={filterProfile}
          setFilterProfile={setFilterProfile}
          curriculumSubjects={curriculumSubjects}
          filteredCurriculum={filteredCurriculum}
          disciplines={disciplines}
          filteredSchedule={filteredSchedule}
          days={days}
          onStartEditCurriculum={onStartEditCurriculum}
          onDeleteCurriculumItem={onDeleteCurriculumItem}
          onStartEditSchedule={onStartEditSchedule}
          onDeleteScheduleItem={onDeleteScheduleItem}
        />
      )}

      {/* TAB 2: TREE */}
      {reviewTab === 'tree' && activeMode === 'curriculum' && (
        <ReviewTreeTab
          courseProfiles={courseProfiles}
          structureOnly
          extractedProfile={extractedProfile}
          onSelectProfileToReview={onSelectProfileToReview}
          onAddNewProfile={onAddNewProfile}
          onRequestDeleteProfile={onRequestDeleteProfile}
          onStartEditProfileMeta={onStartEditProfileMeta}
          extractedTreeSubjects={extractedTreeSubjects}
          selectedTreePeriod={selectedTreePeriod}
          setSelectedTreePeriod={setSelectedTreePeriod}
          treeSearch={treeSearch}
          setTreeSearch={setTreeSearch}
          onAddBlankTreeNode={onAddBlankTreeNode}
          onOpenMatrizView={onOpenMatrizView}
          onStartEditTreeNode={onStartEditTreeNode}
          onDeleteTreeNode={onDeleteTreeNode}
        />
      )}

      {/* TAB 3: VISUAL */}
      {reviewTab === 'visual' && activeMode === 'schedule' && (
        <ReviewVisualTab
          disciplines={disciplines}
          activeProfiles={activeProfiles}
          filterProfile={filterProfile}
          setFilterProfile={setFilterProfile}
          selectedPreviewPeriod={selectedPreviewPeriod}
          setSelectedPreviewPeriod={setSelectedPreviewPeriod}
          availableTimeSlots={availableTimeSlots}
          days={days}
          onStartEditSchedule={onStartEditSchedule}
        />
      )}

      {/* TAB 4: JSON */}
      {reviewTab === 'json' && (
        <ReviewJsonTab
          schemaValidation={schemaValidation}
          copied={copied}
          onCopyJson={onCopyJson}
          onApplyJsonEdit={onApplyJsonEdit}
          jsonError={jsonError}
          jsonText={jsonText}
          setJsonText={setJsonText}
        />
      )}
    </div>
  );
}
