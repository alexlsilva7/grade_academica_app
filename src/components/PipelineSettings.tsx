import { canReadFiles, pipelineModels, pipelineStages, type PipelineConfig } from '../utils/pipelineConfig';

const labels = { reading: 'Leitura de PDF/imagens', inventory: 'Inventário de seções', catalogue: 'Disciplinas e horários', details: 'Cargas, créditos e ementas', relations: 'Pré-requisitos e equivalências', repair: 'Correção de JSON inválido' };
export function PipelineSettings({ value, onChange, disabled, curriculum }: {
  value: PipelineConfig; onChange: (value: PipelineConfig) => void; disabled: boolean; curriculum: boolean;
}) {
  return <fieldset disabled={disabled} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
    <legend className="text-sm font-semibold px-2">Modelos da pipeline</legend>
    <p className="text-xs text-slate-500">O leitor transforma cada página em texto uma vez por extração. As demais etapas podem usar modelos NVIDIA somente de texto. Chaves são configuradas no servidor; disponibilidade depende da sua conta.</p>
    <div className="grid sm:grid-cols-2 gap-3">
      {pipelineStages.filter(stage => curriculum || !['details', 'relations'].includes(stage)).map(stage => <label key={stage} className="text-xs space-y-1">
        <span className="block">{labels[stage]}</span>
        <select className="w-full rounded border p-2 bg-white dark:bg-slate-800" value={value.models[stage] || ''} onChange={e => onChange({ ...value, models: { ...value.models, [stage]: e.target.value } })}>
          <option value="">{stage === 'reading' ? 'Sem leitura separada (anexos em cada etapa)' : stage === 'repair' ? 'Mesmo modelo da etapa com erro' : 'Usar modelo principal'}</option>
          {pipelineModels.filter(([id]) => stage !== 'reading' || canReadFiles(id)).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>)}
      <label className="text-xs space-y-1"><span className="block">Chamadas paralelas por extração</span>
        <select className="w-full rounded border p-2 bg-white dark:bg-slate-800" value={value.concurrency} onChange={e => onChange({ ...value, concurrency: Number(e.target.value) })}>
          {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
    </div>
    <p className="text-xs text-amber-600">Leitura por texto pode perder setas e layout de fluxogramas. Para análise visual, desative a leitura separada e escolha modelos multimodais nas etapas. A leitura Moonshot é serializada automaticamente por causa do limite da organização; as demais etapas mantêm o paralelismo escolhido.</p>
  </fieldset>;
}
