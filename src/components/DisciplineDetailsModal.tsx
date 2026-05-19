import React from 'react';
import { X, Book, Clock, AlertCircle, Link, FileText, CheckCircle2, Circle } from 'lucide-react';
import { Discipline } from '../types';
import bccData from '../bcc_dados.json';
import conteudosData from '../conteudos.json';

interface DisciplineDetailsModalProps {
  discipline: Discipline;
  onClose: () => void;
  completedDisciplines: string[];
  toggleCompleted: (id: string) => void;
  getDisciplineConflictInstance: (disc: Discipline) => { withName: string } | null;
}

export function DisciplineDetailsModal({ 
  discipline, 
  onClose,
  completedDisciplines,
  toggleCompleted,
  getDisciplineConflictInstance
}: DisciplineDetailsModalProps) {
  const conflict = getDisciplineConflictInstance(discipline);

  // Find subject details in JSON by code
  const subjectDetails = discipline.code 
    ? bccData.subjects.find(s => s.code === discipline.code) 
    : bccData.subjects.find(s => s.name.toLowerCase() === discipline.name.toLowerCase());

  // Normalize codes to match variations like BCC00022 and BCC0022
  const normalizeCode = (c?: string) => c?.toUpperCase().replace(/([A-Z]+)0+([0-9]+)/, '$1$2') || '';

  const possibleCodes = [
    discipline.code,
    subjectDetails?.code,
    ...(subjectDetails?.equivalences?.map(e => e.code) || [])
  ].filter(Boolean) as string[];

  const normalizedPossibleCodes = possibleCodes.map(normalizeCode);

  const finalConteudoDetails = conteudosData.disciplinas.find(d => 
    normalizedPossibleCodes.includes(normalizeCode(d.codigo))
  ) || conteudosData.disciplinas.find(d => 
    d.nome.toLowerCase() === discipline.name.toLowerCase()
  );

  const displayCode = discipline.code || subjectDetails?.code || finalConteudoDetails?.codigo;
  const discIdentifier = displayCode || discipline.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800 leading-tight pr-4">
              {discipline.name}
            </h2>
            {displayCode && (
              <span className="inline-block mt-1 text-xs font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                {displayCode}
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {conflict && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3.5 rounded-lg flex items-start gap-2.5 shadow-sm">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Conflito de Horário!</span> Esta disciplina choque de horário com <span className="font-semibold text-amber-950">{conflict.withName}</span> que já está adicionada à sua grade de horário atual.
              </div>
            </div>
          )}
          
          {(subjectDetails || finalConteudoDetails) ? (
            <>
              {/* Basic Info Tags */}
              <div className="flex flex-wrap gap-2">
                {subjectDetails && (
                  <div className="flex border border-slate-200 rounded overflow-hidden">
                    <div className="bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 border-r border-slate-200">
                      Tipo
                    </div>
                    <div className="px-2 py-1 text-xs font-medium text-slate-800">
                      {subjectDetails.type}
                    </div>
                  </div>
                )}
                
                {subjectDetails?.period && subjectDetails.period !== "0" && (
                  <div className="flex border border-slate-200 rounded overflow-hidden">
                    <div className="bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 border-r border-slate-200">
                      Período
                    </div>
                    <div className="px-2 py-1 text-xs font-medium text-slate-800">
                      {subjectDetails.period}º
                    </div>
                  </div>
                )}
                
                {subjectDetails?.credits && (
                  <div className="flex border border-slate-200 rounded overflow-hidden">
                    <div className="bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 border-r border-slate-200">
                      Créditos
                    </div>
                    <div className="px-2 py-1 text-xs font-medium text-slate-800">
                      {subjectDetails.credits}
                    </div>
                  </div>
                )}
              </div>

              {/* Workload */}
              {subjectDetails?.workload && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                  <h3 className="text-xs uppercase tracking-wider font-bold text-blue-800 mb-2 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    Carga Horária ({subjectDetails.workload.total}h)
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white px-2 py-1.5 rounded border border-blue-50">
                      <div className="text-[10px] text-blue-500 uppercase font-semibold">Teórica</div>
                      <div className="text-sm font-bold text-slate-700">{subjectDetails.workload.teorica}h</div>
                    </div>
                    <div className="bg-white px-2 py-1.5 rounded border border-blue-50">
                      <div className="text-[10px] text-blue-500 uppercase font-semibold">Prática</div>
                      <div className="text-sm font-bold text-slate-700">{subjectDetails.workload.pratica}h</div>
                    </div>
                    <div className="bg-white px-2 py-1.5 rounded border border-blue-50">
                      <div className="text-[10px] text-blue-500 uppercase font-semibold">Extensão</div>
                      <div className="text-sm font-bold text-slate-700">{subjectDetails.workload.extensao}h</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Requirements & Equivalences */}
              {subjectDetails && (subjectDetails.prerequisites.length > 0 || subjectDetails.corequisites.length > 0 || subjectDetails.equivalences.length > 0) && (
                <div className="space-y-3">
                  {subjectDetails.prerequisites.length > 0 && (
                    <div>
                      <h3 className="text-xs uppercase tracking-wider font-bold text-amber-600 mb-1 flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                        Pré-requisitos
                      </h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {subjectDetails.prerequisites.map((req: any, idx: number) => (
                          <li key={idx} className="text-sm text-slate-700">
                            <span className="font-mono text-xs bg-slate-100 px-1 rounded mr-1">{req.code}</span>
                            {req.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {subjectDetails.corequisites.length > 0 && (
                    <div>
                      <h3 className="text-xs uppercase tracking-wider font-bold text-orange-600 mb-1 flex items-center">
                        <Link className="w-3.5 h-3.5 mr-1" />
                        Co-requisitos
                      </h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {subjectDetails.corequisites.map((req: any, idx: number) => (
                          <li key={idx} className="text-sm text-slate-700">
                            <span className="font-mono text-xs bg-slate-100 px-1 rounded mr-1">{req.code}</span>
                            {req.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {subjectDetails.equivalences.length > 0 && (
                    <div>
                      <h3 className="text-xs uppercase tracking-wider font-bold text-emerald-600 mb-1 flex items-center">
                        <Book className="w-3.5 h-3.5 mr-1" />
                        Equivalências
                      </h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {subjectDetails.equivalences.map((eq: any, idx: number) => (
                          <li key={idx} className="text-sm text-slate-700">
                            <span className="font-mono text-xs bg-slate-100 px-1 rounded mr-1">{eq.code}</span>
                            {eq.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Ementa */}
              {subjectDetails?.ementa && subjectDetails.ementa !== "Não encontrada" && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-2 border-b border-slate-200 pb-1">
                    Ementa
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {subjectDetails.ementa}
                  </p>
                </div>
              )}

              {/* Conteúdo Programático */}
              {finalConteudoDetails?.conteudo_programatico && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-2 border-b border-slate-200 pb-1 flex items-center">
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    Conteúdo Programático
                  </h3>
                  <div className="text-sm text-slate-600 leading-relaxed space-y-1">
                    {finalConteudoDetails.conteudo_programatico.split(/;\s*/).map((item, index) => (
                      <p key={index} className="pl-1 border-l-2 border-slate-200">{item.trim()}</p>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <Book className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">
                Nenhum detalhe disponível para esta disciplina no catálogo salvos.
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
          <button
            onClick={() => toggleCompleted(discIdentifier)}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${
              completedDisciplines.includes(discIdentifier)
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {completedDisciplines.includes(discIdentifier) ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Concluída
              </>
            ) : (
              <>
                <Circle className="w-4 h-4 mr-2 text-slate-400" />
                Marcar como concluída
              </>
            )}
          </button>
          
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
