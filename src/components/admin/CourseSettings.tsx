import { CourseMeta } from '../../types';

export type CourseVisibility = Pick<CourseMeta, 'hidden' | 'showSchedule' | 'showDisciplines' | 'showMatriz' | 'visibleSemesters'>;
export function CourseSettings({ name, shortName, visibility, semesters, creating, onName, onShortName, onVisibility, onDelete }: {
  name: string; shortName: string; visibility: CourseVisibility; semesters: string[]; creating: boolean;
  onName: (value: string) => void; onShortName: (value: string) => void; onVisibility: (value: CourseVisibility) => void; onDelete: () => void;
}) {
  const selected = visibility.visibleSemesters || [];
  return <div className="space-y-6 max-w-4xl">
    <section className="admin-panel space-y-4"><h2 className="font-semibold">Identificação</h2>
      <div className="grid grid-cols-[1fr_160px] gap-4">
        <label className="text-sm">Nome do curso<input aria-label="Nome do curso" value={name} onChange={e => onName(e.target.value)} className="admin-input mt-2" /></label>
        <label className="text-sm">Sigla<input aria-label="Sigla do curso" value={shortName} onChange={e => onShortName(e.target.value)} className="admin-input mt-2" /></label>
      </div>
    </section>
    <section className="admin-panel space-y-4"><h2 className="font-semibold">Visibilidade para os alunos</h2>
      {([['hidden', 'Ocultar este curso'], ['showSchedule', 'Exibir horários'], ['showDisciplines', 'Exibir disciplinas'], ['showMatriz', 'Exibir matriz curricular']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={!!visibility[key]} onChange={e => onVisibility({ ...visibility, [key]: e.target.checked })} />{label}</label>)}
    </section>
    <section className="admin-panel space-y-4"><h2 className="font-semibold">Semestres disponíveis</h2>
      <p className="text-sm text-slate-500">Ative os semestres visíveis aos alunos. O primeiro da lista será aberto por padrão. Desativar preserva a oferta cadastrada.</p>
      {!semesters.length && <p className="text-sm">Nenhuma oferta salva. Cadastre um semestre em Oferta semestral.</p>}
      {[...selected, ...semesters.filter(semester => !selected.includes(semester))].map(semester => <div key={semester} className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-sm">
        <label className="flex items-center gap-3 flex-1"><input type="checkbox" checked={selected.includes(semester)} onChange={e => onVisibility({ ...visibility, visibleSemesters: e.target.checked ? [...selected, semester] : selected.filter(item => item !== semester) })} />{semester}{selected[0] === semester && <span className="text-xs text-indigo-600 dark:text-indigo-300">Padrão</span>}</label>
        {selected.includes(semester) && selected[0] !== semester && <button onClick={() => onVisibility({ ...visibility, visibleSemesters: [semester, ...selected.filter(item => item !== semester)] })} className="text-indigo-600 dark:text-indigo-300 text-xs">Definir como padrão</button>}
      </div>)}
    </section>
    {!creating && <section className="rounded-xl border border-rose-200 dark:border-rose-900 p-6 space-y-3"><h2 className="font-semibold text-rose-700 dark:text-rose-300">Excluir curso</h2><p className="text-sm text-slate-500">Remove o curso, todas as matrizes e as ofertas de todos os semestres.</p><button onClick={onDelete} className="text-sm rounded-lg border border-rose-300 text-rose-700 dark:text-rose-300 px-4 py-2">Excluir curso…</button></section>}
  </div>;
}
