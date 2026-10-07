import { ArrowLeft, BookOpen, CalendarDays, Database, GitFork, Layers, Plus, Settings, Sparkles, MessageSquare } from 'lucide-react';
import { CourseMeta } from '../../types';

export const ADMIN_SECTIONS = [
  { id: 'schedule', label: 'Oferta semestral', icon: CalendarDays, description: 'Turmas, professores e horários do semestre selecionado.' },
  { id: 'catalog', label: 'Disciplinas', icon: BookOpen, description: 'Conteúdo e vínculos das disciplinas do curso.' },
  { id: 'profiles', label: 'Perfis curriculares', icon: Layers, description: 'Matrizes, vigência e cargas horárias exigidas.' },
  { id: 'structure', label: 'Estrutura e pré-requisitos', icon: GitFork, description: 'Distribuição por período e dependências entre disciplinas.' },
  { id: 'import', label: 'Importação assistida', icon: Sparkles, description: 'Prepare o JSON, confira as diferenças e aplique ao rascunho.' },
  { id: 'migration', label: 'Migração de dados', icon: Database, description: 'Compare os arquivos acadêmicos e importe cursos para o Supabase.' },
  { id: 'feedback', label: 'Feedbacks', icon: MessageSquare, description: 'Sugestões, problemas e correções enviados pelos visitantes.' },
  { id: 'settings', label: 'Configurações do curso', icon: Settings, description: 'Identificação, visibilidade e semestres disponíveis aos alunos.' },
] as const;
export type AdminSection = typeof ADMIN_SECTIONS[number]['id'];
export type SaveDomain = 'settings' | 'curriculum' | 'schedule';
export function readAdminSection(courseId: string): AdminSection {
  try {
    const saved = localStorage.getItem(`admin_section_${courseId}`);
    return ADMIN_SECTIONS.find(section => section.id === saved)?.id || 'schedule';
  } catch { return 'schedule'; }
}

export function AdminSidebar({ courses, courseId, creating, section, dirty, disabled, onCourse, onSection, onBack }: {
  courses: CourseMeta[]; courseId: string; creating: boolean; section: AdminSection;
  dirty: Record<SaveDomain, boolean>; disabled: boolean;
  onCourse: (id: string) => void; onSection: (section: AdminSection) => void; onBack: () => void;
}) {
  return <aside className="w-64 shrink-0 h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
    <div className="p-5 border-b border-slate-200 dark:border-slate-800">
      <p className="font-bold text-lg tracking-tight">Admin acadêmico</p>
      <p className="text-xs text-slate-500 mt-1">Gestão do curso</p>
      {section === 'feedback' ? <p className="mt-6 text-xs text-slate-500">Caixa de entrada privada de todos os cursos.</p> : section === 'migration' ? <p className="mt-6 text-xs text-slate-500">A migração considera todos os cursos e semestres inventariados.</p> : <>
      <label className="block mt-6 text-xs font-semibold" htmlFor="admin-course">Curso em edição</label>
      <select id="admin-course" disabled={disabled} value={creating ? '__new__' : courseId} onChange={event => onCourse(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-sm">
        {courses.map(course => <option key={course.id} value={course.id}>{course.shortName} · {course.name}</option>)}
        {creating && <option value="__new__">Novo curso</option>}
      </select>
      <button disabled={disabled || creating} onClick={() => onCourse('__new__')} className="mt-3 flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 disabled:opacity-40"><Plus size={14} /> Cadastrar curso</button>
      </>}
    </div>
    <nav aria-label="Administração do curso" className="flex-1 overflow-y-auto p-3 space-y-1">
      {ADMIN_SECTIONS.map(({ id, label, icon: Icon }) => {
        const domain = id === 'settings' ? 'settings' : id === 'schedule' ? 'schedule' : id === 'import' || id === 'migration' || id === 'feedback' ? null : 'curriculum';
        return <button key={id} aria-label={label} disabled={disabled} aria-current={section === id ? 'page' : undefined} onClick={() => onSection(id)} className={`w-full flex items-center gap-3 text-left rounded-lg px-3 py-3 text-sm transition-colors disabled:opacity-50 ${section === id ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
          <Icon size={18} className="shrink-0" /><span className="flex-1">{label}</span>
          {domain && dirty[domain] && <span title="Alterações pendentes" aria-label="Alterações pendentes" className="w-2 h-2 rounded-full bg-amber-500" />}
        </button>;
      })}
    </nav>
    <button disabled={disabled} onClick={onBack} className="m-3 p-3 flex items-center gap-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><ArrowLeft size={16} /> Voltar ao início</button>
  </aside>;
}
