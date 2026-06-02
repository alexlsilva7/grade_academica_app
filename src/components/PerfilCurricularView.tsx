import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ArrowLeft, Target, Briefcase, GraduationCap, Code } from 'lucide-react';
import perfilData from '../perfil_curricular_bcc.json';

interface PerfilCurricularViewProps {
  setView: (view: 'home' | 'schedule' | 'matriz' | 'disciplines' | 'perfil') => void;
  darkMode: boolean;
}

export function PerfilCurricularView({ setView, darkMode }: PerfilCurricularViewProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    objetivos: false,
    perfil: false,
    aptidoes: false,
    organizacao: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex flex-col animate-in fade-in duration-500 overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 shrink-0 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setView('home')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg text-slate-800 dark:text-slate-100">Perfil Curricular</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ciência da Computação (BCC)</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
          
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-4">
              Projeto Pedagógico do Curso (PPC)
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
              Explore os principais aspectos do perfil do egresso, objetivos do curso e estrutura curricular que guiam a formação técnica e cidadã no curso de Ciência da Computação.
            </p>
          </div>

          {/* Objetivos Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleSection('objetivos')}
              className="w-full flex items-center justify-between p-5 text-left focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">Objetivos do Curso</h3>
              </div>
              {openSections.objetivos ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            
            {openSections.objetivos && (
              <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800/50 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed animate-in slide-in-from-top-2 duration-300">
                <div className="mt-4">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Objetivo Geral</h4>
                  <p className="mb-6">{perfilData.objetivo_geral}</p>
                  
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Objetivos Específicos</h4>
                  <ul className="space-y-2">
                    {perfilData.objetivos_especificos.map((obj, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Perfil do Egresso Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleSection('perfil')}
              className="w-full flex items-center justify-between p-5 text-left focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">Perfil do Egresso</h3>
              </div>
              {openSections.perfil ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            
            {openSections.perfil && (
              <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800/50 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed animate-in slide-in-from-top-2 duration-300">
                <div className="mt-4 space-y-4">
                  {perfilData.perfil_egresso.split('\n\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Aptidões e Papéis Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleSection('aptidoes')}
              className="w-full flex items-center justify-between p-5 text-left focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">Papéis e Problemas</h3>
              </div>
              {openSections.aptidoes ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            
            {openSections.aptidoes && (
              <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800/50 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed animate-in slide-in-from-top-2 duration-300">
                <div className="mt-4">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">O egresso deve estar apto a resolver problemas sobre:</h4>
                  <ul className="space-y-2 mb-6 ml-2 border-l-2 border-slate-200 dark:border-slate-700 pl-4 py-1">
                    {perfilData.problemas_aptos.map((prob, i) => (
                      <li key={i}>{prob}</li>
                    ))}
                  </ul>

                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Possíveis papéis no mercado de trabalho:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {perfilData.funcoes_mercado.map((funcao, i) => (
                      <div key={i} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg">
                        <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-1">{funcao.titulo}</h5>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{funcao.descricao}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Organização Curricular Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleSection('organizacao')}
              className="w-full flex items-center justify-between p-5 text-left focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 rounded-lg flex items-center justify-center">
                  <Code className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">Organização Curricular</h3>
              </div>
              {openSections.organizacao ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            
            {openSections.organizacao && (
              <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800/50 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed animate-in slide-in-from-top-2 duration-300">
                <div className="mt-4 space-y-4">
                  {perfilData.organizacao_curricular.split('\n\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                  
                  <div className="mt-6 flex flex-col items-center sm:items-start">
                    <button 
                      onClick={() => setView('matriz')}
                      className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium shadow-sm hover:bg-slate-800 dark:hover:bg-white transition-colors"
                    >
                      Acessar Matriz Curricular
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
