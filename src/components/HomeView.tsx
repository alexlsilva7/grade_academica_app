import React from 'react';
import { BookOpen, FileText, Upload, Plus } from 'lucide-react';

interface HomeViewProps {
  loadPredefinedGrade: () => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isProcessingPdf: boolean;
}

export function HomeView({ loadPredefinedGrade, handleFileUpload, isProcessingPdf }: HomeViewProps) {
  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-800 font-sans flex flex-col items-center justify-center p-6 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
      <div className="w-full max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto shadow-lg shadow-indigo-200">
            G
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900">Grade Acadêmica</h1>
          <p className="text-slate-500 text-lg">Monte seu horário perfeito de forma simples e visual.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12 w-full max-w-2xl mx-auto">
          {/* Saved Grades */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-start text-left">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Grades Salvas</h2>
            <p className="text-sm text-slate-500 mb-6 flex-1">Comece com uma grade de disciplinas pré-cadastrada no sistema.</p>
            
            <button 
              onClick={loadPredefinedGrade}
              className="w-full p-4 border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 rounded-xl transition-all text-left group"
            >
              <div className="font-semibold text-slate-700 group-hover:text-indigo-700 text-sm">
                BCC - Ciência da Computação
              </div>
              <div className="text-xs text-slate-400 mt-1">Período 2026.1</div>
            </button>
          </div>

          {/* Import PDF */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-start text-left relative overflow-hidden">
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              id="home-pdf-upload"
              onChange={handleFileUpload}
            />
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Importar Nova</h2>
            <p className="text-sm text-slate-500 mb-6 flex-1">A IA do Gemini extrai os dados do seu PDF automaticamente.</p>
            
            <label 
              htmlFor="home-pdf-upload"
              className={`w-full p-4 border border-dashed border-slate-300 rounded-xl transition-all text-center flex flex-col items-center justify-center gap-2 ${
                isProcessingPdf 
                ? 'bg-slate-50 cursor-wait' 
                : 'hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer group'
              }`}
            >
              {isProcessingPdf ? (
                <>
                  <Upload className="w-5 h-5 text-indigo-400 animate-bounce" />
                  <span className="text-sm font-medium text-indigo-600">Processando IA...</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  <span className="text-sm text-slate-600 font-medium group-hover:text-indigo-700">Selecionar PDF</span>
                </>
              )}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
