import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Lightbulb, 
  Search, 
  MousePointer, 
  GitBranch, 
  BookOpen, 
  BarChart2, 
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { motion } from 'motion/react';

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  content: string[];
  tip?: string;
  onEnter?: () => void;
  onLeave?: () => void;
}

interface MatrizTourProps {
  isOpen: boolean;
  onClose: () => void;
  onHoverSamplePrereq?: (active: boolean) => void;
}

export function MatrizTour({ isOpen, onClose, onHoverSamplePrereq }: MatrizTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [manualDock, setManualDock] = useState<'top' | 'bottom' | null>(null);
  const [targetRect, setTargetRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const steps: TourStep[] = useMemo(() => [
    {
      id: 'subject-status',
      targetSelector: '[data-tour="first-subject"]',
      title: 'Status da Matéria',
      category: 'Progresso',
      icon: <MousePointer className="w-4 h-4 text-emerald-500" />,
      content: [
        'Clique na disciplina para alternar o status:',
        '• Pendente (neutro)',
        '• Cursando (amarelo)',
        '• Concluído (verde)'
      ],
      tip: 'A carga horária e o progresso atualizam na hora.'
    },
    {
      id: 'prereqs-flow',
      targetSelector: '[data-tour="prereq-subject"]',
      title: 'Pré-requisitos',
      category: 'Conexões',
      icon: <GitBranch className="w-4 h-4 text-rose-500" />,
      content: [
        'Passe o mouse na matéria para ver a trilha:',
        '• 🔴 Rosa: matérias necessárias antes.',
        '• 🟢 Verde: matérias que ela libera.'
      ],
      tip: 'Veja de onde a disciplina vem e o que ela desbloqueia.',
      onEnter: () => onHoverSamplePrereq?.(true),
      onLeave: () => onHoverSamplePrereq?.(false)
    },
    {
      id: 'subject-details',
      targetSelector: '[data-tour="first-subject"]',
      title: 'Ementa Oficial',
      category: 'Detalhes',
      icon: <BookOpen className="w-4 h-4 text-blue-500" />,
      content: [
        'Clique com o botão direito (ou segure no celular) para abrir a ementa completa e a carga horária detalhada.'
      ],
      tip: 'Botão direito abre o conteúdo programático oficial.'
    },
    {
      id: 'stats-summary',
      targetSelector: '[data-tour="stats-summary"]',
      title: 'Horas, ACEX e ACC',
      category: 'Resumo',
      icon: <BarChart2 className="w-4 h-4 text-violet-500" />,
      content: [
        'Acompanhe a conclusão do curso no rodapé.',
        'Ajuste suas horas de Extensão (ACEX) e Complementares (ACC) usando os sliders.'
      ],
      tip: 'Arraste os sliders para somar suas horas extracurriculares.'
    },
    {
      id: 'help-permanent',
      targetSelector: '[data-tour="help-button"]',
      title: 'Salvar e Ajuda',
      category: 'Pronto!',
      icon: <Sparkles className="w-4 h-4 text-amber-500" />,
      content: [
        'Seu progresso fica salvo automaticamente no navegador.',
        'Clique em "Como Usar" a qualquer momento para rever este guia.'
      ],
      tip: 'Use "Exportar" no topo para salvar um backup.'
    }
  ], [onHoverSamplePrereq]);

  const step = steps[currentStep];

  // Reseta o ajuste manual de posição ao mudar de passo
  useEffect(() => {
    setManualDock(null);
  }, [currentStep]);

  // Atualizar a posição do elemento alvo
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !step) return;

    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, step]);

  // Fazer scroll suave até o elemento e gerenciar classes no elemento focado
  useEffect(() => {
    if (!isOpen || !step) return;

    // Executa onEnter do passo atual
    step.onEnter?.();

    const el = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      el.classList.add('tour-spotlight-active');
    }

    updateTargetRect();
    const t1 = setTimeout(updateTargetRect, 80);
    const t2 = setTimeout(updateTargetRect, 250);
    const t3 = setTimeout(updateTargetRect, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (el) {
        el.classList.remove('tour-spotlight-active');
      }
      step.onLeave?.();
    };
  }, [currentStep, isOpen, step, updateTargetRect]);

  // Ouvir eventos de resize e scroll para manter o spotlight sincronizado
  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [isOpen, updateTargetRect]);

  // Teclado (Esc, Setas)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  const handleClose = () => {
    localStorage.setItem('matriz_tutorial_seen', 'true');
    setCurrentStep(0);
    setManualDock(null);
    onClose();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isOpen) return null;

  const padding = 8;

  // Decisão inteligente de posicionamento (Topo vs Rodapé) para NUNCA obstruir cards ou conexões
  const isDockTop = manualDock ? manualDock === 'top' : (
    step?.id === 'stats-summary' || (targetRect ? targetRect.top > (typeof window !== 'undefined' ? window.innerHeight * 0.52 : 500) : false)
  );

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto">
      {/* SVG com Máscara de Recorte: O elemento em destaque fica 100% nítido, claro e sem blur */}
      <svg 
        className="fixed inset-0 w-full h-full pointer-events-none z-[100]"
        style={{ width: '100vw', height: '100vh' }}
      >
        <defs>
          <mask id="matriz-spotlight-mask">
            {/* Fundo branco = onde a película escura vai aparecer */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Recorte preto = 100% transparente, sem película e sem blur */}
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="14"
                ry="14"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Película escura cobrindo a página, exceto o recorte transparente */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.78)"
          mask="url(#matriz-spotlight-mask)"
          className="pointer-events-auto cursor-pointer"
          onClick={handleNext}
        />
      </svg>

      {/* Moldura iluminada com anel pulsante e neon em volta do elemento destacado */}
      {targetRect && (
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2
          }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed pointer-events-none rounded-2xl border-2 border-indigo-400 dark:border-indigo-400 ring-4 ring-indigo-500/30 shadow-[0_0_28px_rgba(99,102,241,0.55)] z-[102]"
        />
      )}

      {/* Popover / Balão Informativo em Dock Flutuante Inteligente (nunca obstrui o grafo nem as setas) */}
      <div
        className={`
          fixed z-[110] left-1/2 -translate-x-1/2 w-[92vw] max-w-[480px] pointer-events-auto
          ${isDockTop ? 'top-20' : 'bottom-6'}
          transition-all duration-300 ease-out
        `}
      >
        <motion.div
          key={`${currentStep}-${isDockTop ? 'top' : 'bottom'}`}
          initial={{ opacity: 0, y: isDockTop ? -14 : 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22 }}
          className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-2xl p-5 text-slate-800 dark:text-slate-100 flex flex-col gap-4 ring-1 ring-black/5 dark:ring-white/5"
        >
          {/* Cabeçalho do Card */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40">
                {step.icon}
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
                  {currentStep + 1} de {steps.length}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {step.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Botão para alternar posição se o usuário quiser visualizar a área oposta */}
              <button
                onClick={() => setManualDock(isDockTop ? 'bottom' : 'top')}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={isDockTop ? "Mover painel para o rodapé" : "Mover painel para o topo"}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar tutorial"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conteúdo textual */}
          <div className="flex flex-col gap-2 text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed max-h-[38vh] overflow-y-auto pr-1">
            {step.content.map((paragraph, idx) => (
              <p key={idx} className={paragraph.startsWith('•') ? 'pl-2 text-slate-700 dark:text-slate-200 font-medium' : ''}>
                {paragraph}
              </p>
            ))}

            {/* Dica de destaque */}
            {step.tip && (
              <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Dica:</strong> {step.tip}</span>
              </div>
            )}
          </div>

          {/* Rodapé: Navegação e Pontos Indicadores */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Pontos de progresso */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    currentStep === idx 
                      ? 'w-5 bg-indigo-600 dark:bg-indigo-400' 
                      : 'w-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                  title={`Ir para passo ${idx + 1}`}
                />
              ))}
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>{currentStep === steps.length - 1 ? 'Concluir' : 'Próximo'}</span>
                {currentStep === steps.length - 1 ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
