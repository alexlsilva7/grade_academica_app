import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Copy, Check, Loader2, Sparkles } from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import { Discipline } from '../types';
import { ScheduleExportCard } from './ScheduleExportCard';

interface ScheduleImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: string | null;
  courseName?: string;
  semester: string;
  schedule: Discipline[];
  disciplinesList: Discipline[];
}

export function ScheduleImageModal({
  isOpen,
  onClose,
  course,
  courseName,
  semester,
  schedule,
  disciplinesList
}: ScheduleImageModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate image whenever modal opens with content
  useEffect(() => {
    if (!isOpen) {
      setDataUrl(null);
      setCopied(false);
      setErrorMsg(null);
      return;
    }

    let isMounted = true;
    setIsGenerating(true);
    setErrorMsg(null);

    // Give DOM a tick to layout the cardRef before capturing
    const timer = setTimeout(async () => {
      if (!cardRef.current) {
        if (isMounted) setIsGenerating(false);
        return;
      }
      try {
        const url = await toPng(cardRef.current, {
          pixelRatio: 2,
          quality: 1,
          cacheBust: true,
          backgroundColor: '#ffffff'
        });
        if (isMounted) {
          setDataUrl(url);
          setIsGenerating(false);
        }
      } catch (err: any) {
        console.error('Erro ao gerar imagem:', err);
        if (isMounted) {
          setErrorMsg('Não foi possível gerar a imagem da grade.');
          setIsGenerating(false);
        }
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, course, semester, schedule, disciplinesList]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanCourseId = (course || 'curso').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const cleanSemester = (semester || '2026.1').replace(/\./g, '_');
  const fileName = `grade_${cleanCourseId}_${cleanSemester}.png`;

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = async () => {
    if (!cardRef.current) return;
    try {
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        throw new Error('ClipboardItem não suportado neste navegador.');
      }
    } catch (err) {
      console.warn('Falha ao copiar direto para área de transferência:', err);
      // Fallback: download the file
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Off-screen / hidden container for clean capture */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
        <ScheduleExportCard
          ref={cardRef}
          course={course}
          courseName={courseName}
          semester={semester}
          schedule={schedule}
          disciplinesList={disciplinesList}
        />
      </div>

      {/* Modal Dialog */}
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Pré-visualização da imagem da grade"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                Imagem da Grade Horária
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pré-visualização pronta para compartilhar ou imprimir
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-slate-100/60 dark:bg-slate-950/60 min-h-[300px]">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-semibold">Gerando imagem em alta resolução...</span>
            </div>
          ) : errorMsg ? (
            <div className="text-center py-12 text-rose-500 text-xs font-semibold">
              {errorMsg}
            </div>
          ) : dataUrl ? (
            <div className="w-full flex justify-center">
              <img
                src={dataUrl}
                alt="Grade Horária"
                className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-md border border-slate-200 dark:border-slate-800 bg-white"
              />
            </div>
          ) : null}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Formato: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">PNG (2x Retina)</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              disabled={isGenerating || !dataUrl}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
              title="Copiar imagem para colar no WhatsApp ou redes sociais"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Imagem</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              disabled={isGenerating || !dataUrl}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
              title="Baixar arquivo PNG no seu computador"
            >
              <Download className="w-4 h-4" />
              <span>Baixar PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
