import { CurriculumProfile, TreeSubjectNode } from '../../types';

export function ProfileSection({ profiles, nodes, onAdd, onEdit, onDelete, onStructure }: {
  profiles: CurriculumProfile[]; nodes: TreeSubjectNode[]; onAdd: () => void;
  onEdit: (profile: CurriculumProfile) => void; onDelete: (profile: CurriculumProfile) => void; onStructure: (id: string) => void;
}) {
  return <div className="space-y-5">
    <div className="flex justify-between items-center"><p className="text-sm text-slate-500">Cada perfil representa uma matriz curricular do curso.</p><button className="admin-primary" onClick={onAdd}>Novo perfil</button></div>
    {!profiles.length && <div className="admin-panel text-sm">Nenhum perfil cadastrado. Crie um perfil ou importe os metadados da matriz.</div>}
    {profiles.map(profile => {
      const subjects = nodes.filter(node => node.profile === profile.id);
      const knownHours = subjects.filter(node => node.hours != null);
      const sum = knownHours.reduce((total, node) => total + (node.hours || 0), 0);
      return <section key={profile.id} className="admin-panel space-y-5">
        <div className="flex justify-between gap-4"><div><h2 className="font-semibold">{profile.id} · {profile.name || 'Sem nome'}</h2><p className="text-sm text-slate-500 mt-1">Vigência: {profile.validFromSemester || 'Não informada'} · {subjects.length} disciplinas</p></div><div className="flex items-start gap-4 text-sm"><button className="text-indigo-600 dark:text-indigo-300" onClick={() => onEdit(profile)}>Editar perfil</button><button className="text-rose-600" onClick={() => onDelete(profile)}>Excluir…</button></div></div>
        <dl className="grid grid-cols-6 gap-3">{([['Total exigido', profile.totalHours], ['Obrigatórias', profile.mandatoryHours], ['Optativas', profile.optativeHours], ['ACEX', profile.acexHours], ['ACC', profile.accHours], ['Soma cadastrada', sum]] as const).map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="font-semibold mt-2">{value == null ? 'Não informado' : `${value} h`}</dd></div>)}</dl>
        <p className="text-xs text-slate-500">{knownHours.length < subjects.length ? `${subjects.length - knownHours.length} disciplinas sem carga informada. ` : ''}{profile.totalHours != null && sum !== profile.totalHours ? `A soma cadastrada difere do total exigido em ${Math.abs(sum - profile.totalHours)} h. ` : ''}ACEX e ACC podem integrar outras cargas; não são somadas automaticamente ao total.</p>
        <button className="text-sm font-medium text-indigo-600 dark:text-indigo-300" onClick={() => onStructure(profile.id)}>Abrir estrutura deste perfil →</button>
      </section>;
    })}
  </div>;
}
