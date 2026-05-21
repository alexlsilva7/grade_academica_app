import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Search, 
  Filter, 
  RotateCcw, 
  HelpCircle, 
  GraduationCap, 
  Info,
  ChevronRight,
  Eye,
  Award,
  Download,
  Upload,
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  BarChart2
} from 'lucide-react';
import { ThemeMode } from '../hooks/useSchedule';
import { Navbar } from './Navbar';

// --- ESTRUTURA COMPLETA DA MATRIZ DO CURSO ---
const INITIAL_SUBJECTS = [
  // 1º Período
  { id: 'log_mat_1', code: 'MATM3008', name: 'Lógica Matemática I', hours: 60, period: 1, type: 'basico', prereqs: [], desc: 'Introdução à lógica proposicional e de primeira ordem, sistemas de dedução natural, semântica e completude.' },
  { id: 'geo_anal', code: 'MATM3021', name: 'Geometria Analítica', hours: 60, period: 1, type: 'basico', prereqs: [], desc: 'Vetores no plano e no espaço, retas e planos, cónicas, quádricas e transformações de coordenadas.' },
  { id: 'intro_prog_1', code: 'CCMP3057', name: 'Introdução à Programação I', hours: 90, period: 1, type: 'computacao', prereqs: [], desc: 'Desenvolvimento do pensamento algorítmico, lógica de programação, variáveis, estruturas condicionais/repetição e funções.' },
  { id: 'intro_comp', code: 'CCMP3056', name: 'Introdução à Computação', hours: 30, period: 1, type: 'computacao', prereqs: [], desc: 'História da computação, arquitetura básica de computadores, sistemas de numeração, representação de dados e ética.' },
  { id: 'metod_cient', code: 'CIEN3005', name: 'Metodologia Científica para Computação', hours: 60, period: 1, type: 'outros', prereqs: [], desc: 'Método científico, técnicas de pesquisa, leitura e redação de artigos técnicos, normas ABNT e ética científica.' },

  // 2º Período
  { id: 'alg_lin', code: 'MATM3019', name: 'Álgebra Linear', hours: 60, period: 2, type: 'basico', prereqs: ['geo_anal'], desc: 'Espaços vetoriais, transformações lineares, matrizes, determinantes, autovalores, autovetores e diagonalização.' },
  { id: 'calc_1', code: 'MATM3031', name: 'Cálculo I', hours: 60, period: 2, type: 'basico', prereqs: ['geo_anal'], desc: 'Limites e continuidade, derivadas de funções de uma variável, aplicações da derivada e introdução à integração.' },
  { id: 'aed_1', code: 'CCMP3006', name: 'Algoritmos e Estruturas de Dados I', hours: 60, period: 2, type: 'computacao', prereqs: ['intro_prog_1'], desc: 'Ponteiros, alocação dinâmica de memória, estruturas lineares (listas, pilhas, filas) e algoritmos de pesquisa/ordenação.' },
  { id: 'poo', code: 'CCMP3017', name: 'Programação Orientada ao Objeto', hours: 60, period: 2, type: 'computacao', prereqs: ['intro_prog_1'], desc: 'Conceitos de objetos, classes, encapsulamento, herança, polimorfismo, interfaces, tratamento de exceções e padrões de projeto básicos.' },
  { id: 'sist_dig', code: 'CCMP3058', name: 'Sistemas Digitais', hours: 60, period: 2, type: 'computacao', prereqs: ['intro_comp'], desc: 'Álgebra de Boole, minimização de funções lógicas, circuitos combinacionais e sequenciais, flip-flops, contadores e registradores.' },

  // 3º Período
  { id: 'mat_disc', code: 'CCMP3059', name: 'Matemática Discreta', hours: 60, period: 3, type: 'basico', prereqs: ['log_mat_1'], desc: 'Teoria dos conjuntos, relações, funções, indução matemática, análise combinatória e teoria dos grafos.' },
  { id: 'calc_2', code: 'MATM3032', name: 'Cálculo II', hours: 60, period: 3, type: 'basico', prereqs: ['calc_1'], desc: 'Técnicas de integração, sequências e séries numéricas, funções de várias variáveis, derivadas parciais e integrais múltiplas.' },
  { id: 'aed_2', code: 'CCMP3016', name: 'Algoritmos e Estruturas de Dados II', hours: 60, period: 3, type: 'computacao', prereqs: ['aed_1'], desc: 'Árvores binárias de pesquisa, árvores balanceadas (AVL, Rubro-Negra), árvores B, tabelas Hash e manipulação de arquivos.' },
  { id: 'comp_graf', code: 'CCMP3019', name: 'Computação Gráfica', hours: 60, period: 3, type: 'computacao', prereqs: ['aed_1', 'alg_lin'], desc: 'Transformações geométricas 2D/3D, projeções, pipeline gráfico, modelos de iluminação, texturização e rasterização.' },
  { id: 'arq_comp', code: 'CCMP3010', name: 'Arquitetura de Computadores', hours: 60, period: 3, type: 'computacao', prereqs: ['sist_dig'], desc: 'Conjunto de instruções (ISA), organização da CPU, barramentos, hierarquia de memória (cache/virtual) e sistemas de E/S.' },

  // 4º Período
  { id: 'banco_dados', code: 'CCMP3066', name: 'Banco de Dados', hours: 60, period: 4, type: 'computacao', prereqs: ['aed_2'], desc: 'Modelagem de dados (Entidade-Relacionamento), modelo relacional, álgebra relacional, linguagem SQL e normalização.' },
  { id: 'prob_est', code: 'PRBE3006', name: 'Probabilidade e Estatística', hours: 60, period: 4, type: 'basico', prereqs: ['calc_2'], desc: 'Análise exploratória de dados, probabilidade, variáveis aleatórias, distribuições, amostragem e testes de hipóteses.' },
  { id: 'paradigmas', code: 'CCMP3065', name: 'Paradigmas de Linguagens de Programação I', hours: 60, period: 4, type: 'computacao', prereqs: ['aed_2'], desc: 'Estudo comparativo dos paradigmas de programação: funcional, lógico, imperativo e orientado a objetos.' },
  { id: 'paa', code: 'CCMP3064', name: 'Projeto e Análise de Algoritmos I', hours: 60, period: 4, type: 'computacao', prereqs: ['aed_2', 'mat_disc'], desc: 'Análise assintótica (notação Big-O), recorrências, algoritmos gulosos, divisão e conquista, e programação dinâmica.' },
  { id: 'eng_soft_1', code: 'CCMP3018', name: 'Engenharia de Software I', hours: 60, period: 4, type: 'computacao', prereqs: ['poo'], desc: 'Ciclo de vida do software, processos de desenvolvimento (Ágeis/Tradicionais), elicitação de requisitos e modelagem UML.' },

  // 5º Período
  { id: 'ihc', code: 'CCMP3070', name: 'Interação Humano-Computador I', hours: 60, period: 5, type: 'computacao', prereqs: ['eng_soft_1'], desc: 'Design de interface de utilizador, avaliação de usabilidade, acessibilidade, prototipagem e fatores humanos.' },
  { id: 'teoria_comp', code: 'CCMP3068', name: 'Teoria da Computação', hours: 60, period: 5, type: 'computacao', prereqs: ['mat_disc'], desc: 'Linguagens regulares, autômatos finitos, gramáticas livres de contexto, máquinas de Turing e decidibilidade.' },
  { id: 'ia_1', code: 'CCMP3014', name: 'Inteligência Artificial I', hours: 60, period: 5, type: 'computacao', prereqs: ['paa'], desc: 'Algoritmos de busca (cega e heurística), jogos, representação do conhecimento, sistemas especialistas e introdução ao ML.' },
  { id: 'sist_oper', code: 'CCMP3009', name: 'Sistemas Operacionais', hours: 60, period: 5, type: 'computacao', prereqs: ['arq_comp'], desc: 'Estrutura do SO, gerência de processos (escalonamento/sincronização), gerência de memória e sistemas de arquivos.' },
  { id: 'redes', code: 'CCMP3023', name: 'Redes de Computadores', hours: 60, period: 5, type: 'computacao', prereqs: ['arq_comp'], desc: 'Arquitetura em camadas, protocolos de aplicação, camada de transporte (TCP/UDP), IP, roteamento e enlace.' },

  // 6º Período
  { id: 'empreendedorismo', code: 'BCC00003', name: 'Empreendedorismo I', hours: 60, period: 6, type: 'outros', prereqs: [], desc: 'Criação de novos empreendimentos, planos de negócios, inovação tecnológica, marketing e captação de recursos.' },
  { id: 'compiladores', code: 'CCMP3020', name: 'Compiladores', hours: 60, period: 6, type: 'computacao', prereqs: ['teoria_comp'], desc: 'Fases do compilador: análise léxica, análise sintática, análise semântica, geração de código intermédio e otimização.' },
  { id: 'reconhecimento_padroes', code: 'CCMP3043', name: 'Reconhecimento de Padrão I', hours: 60, period: 6, type: 'computacao', prereqs: ['ia_1', 'prob_est'], desc: 'Pré-processamento de dados, extração de características, classificadores estatísticos, redes neuronais e agrupamento (clustering).' },
  { id: 'sist_info', code: 'CCMP3067', name: 'Sistemas de Informação e Tecnologias I', hours: 60, period: 6, type: 'computacao', prereqs: ['banco_dados'], desc: 'Sistemas de informação organizacionais, segurança, auditoria de TI, governança de TI (COBIT/ITIL) e tendências.' },
  { id: 'sist_distrib', code: 'CCMP3021', name: 'Sistemas Distribuídos I', hours: 60, period: 6, type: 'computacao', prereqs: ['redes', 'sist_oper'], desc: 'Modelos de sistemas distribuídos, comunicação RPC/RMI, sincronização de relógios, replicação de dados e tolerância a falhas.' },

  // 7º Período
  { id: 'proj_soft', code: 'CCMP3069', name: 'Projeto de Desenvolvimento de Software', hours: 60, period: 7, type: 'computacao', prereqs: ['eng_soft_1'], desc: 'Desenvolvimento integrado de um sistema real, aplicando engenharia de requisitos, testes, arquitetura de software e gestão ágil.' },
  { id: 'opt_7_1', name: 'Optativa I', hours: 60, period: 7, type: 'optativa', prereqs: [], desc: 'Unidade curricular de escolha livre dentro das áreas científicas de computação oferecidas pelo departamento.' },
  { id: 'opt_7_2', name: 'Optativa II', hours: 60, period: 7, type: 'optativa', prereqs: [], desc: 'Unidade curricular de escolha livre dentro das áreas científicas de computação oferecidas pelo departamento.' },
  { id: 'opt_7_3', name: 'Optativa III', hours: 60, period: 7, type: 'optativa', prereqs: [], desc: 'Unidade curricular de escolha livre dentro das áreas científicas de computação oferecidas pelo departamento.' },
  { id: 'opt_7_4', name: 'Optativa IV', hours: 60, period: 7, type: 'optativa', prereqs: [], desc: 'Unidade curricular de escolha livre dentro das áreas científicas de computação oferecidas pelo departamento.' },

  // 8º Período
  { id: 'seg_info', code: 'BCC00045', name: 'Segurança de Informação', hours: 60, period: 8, type: 'computacao', prereqs: ['redes'], desc: 'Ameaças comuns, criptografia simétrica/assimétrica, protocolos seguros (SSL/TLS), firewalls e políticas corporativas de segurança.' },
  { id: 'opt_8_1', name: 'Optativa V', hours: 60, period: 8, type: 'optativa', prereqs: [], desc: 'Unidade curricular de escolha livre dentro das áreas científicas de computação oferecidas pelo departamento.' },
  { id: 'opt_8_2', name: 'Optativa VI', hours: 60, period: 8, type: 'optativa', prereqs: [], desc: 'Unidade curricular de escolha livre dentro das áreas científicas de computação oferecidas pelo departamento.' },
  { id: 'opt_8_3', name: 'Optativa VII', hours: 60, period: 8, type: 'optativa', prereqs: [], desc: 'Unidade curricular de escolha livre dentro das áreas científicas de computação oferecidas pelo departamento.' },
  { id: 'opt_8_4', name: 'Optativa VIII', hours: 60, period: 8, type: 'optativa', prereqs: [], desc: 'Unidade curricular de escolha livre dentro das áreas científicas de computação oferecidas pelo departamento.' },

  // 9º Período
  { id: 'tcc', code: 'CCMP3063', name: 'Trabalho de Conclusão de Curso de BCC', hours: 60, period: 9, type: 'computacao', prereqs: ['proj_soft', 'metod_cient'], desc: 'Pesquisa, desenvolvimento, escrita e defesa pública de uma monografia original ou projeto de fim de curso sob supervisão docente.' },
  { id: 'comp_sociedade', code: 'CCMP3071', name: 'Computadores e Sociedade', hours: 30, period: 9, type: 'computacao', prereqs: [], desc: 'Impactos éticos, profissionais, sociais e legais da computação na sociedade contemporânea e privacidade de dados.' },
  { id: 'estagio', code: 'CCMP3061', name: 'Estágio Obrigatório', hours: 300, period: 9, type: 'estagio', prereqs: ['proj_soft'], desc: 'Atividade supervisionada profissional realizada em ambiente empresarial ou laboratorial externo de TI.' },
];

interface Subject {
  id: string;
  code?: string;
  name: string;
  hours: number;
  period: number;
  type: string;
  prereqs: string[];
  desc: string;
  status: 'pendente' | 'cursando' | 'concluido';
  grade: string;
}

interface MatrizViewProps {
  setView: (view: 'home' | 'schedule' | 'matriz') => void;
  course: string | null;
  darkMode: boolean;
  themePreference: ThemeMode;
  cycleTheme: () => void;
  schedule?: import('../types').Discipline[];
}

export function MatrizView({ setView, course, darkMode, themePreference, cycleTheme, schedule }: MatrizViewProps) {
  // --- ESTADO ---
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem('bcc_matriz_progress');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Erro ao carregar do localStorage", e);
      }
    }
    return INITIAL_SUBJECTS.map(s => ({ ...s, status: 'pendente', grade: '' }));
  });

  const [acexHours, setAcexHours] = useState(() => {
    return Number(localStorage.getItem('bcc_acex_hours')) || 0;
  });
  const [accHours, setAccHours] = useState(() => {
    return Number(localStorage.getItem('bcc_acc_hours')) || 0;
  });

  const [hoveredSubject, setHoveredSubject] = useState<Subject | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const [arrows, setArrows] = useState<{ id: string; type: 'prereq' | 'dependent'; path: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [isMobileGrid, setIsMobileGrid] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // --- PERSISTÊNCIA ---
  useEffect(() => {
    localStorage.setItem('bcc_matriz_progress', JSON.stringify(subjects));
    
    // Synchronize completedDisciplines in localStorage with the completed subjects in the matrix
    try {
      const completedList = subjects
        .filter(s => s.status === 'concluido')
        .map(s => s.code || s.id);
      localStorage.setItem('completedDisciplines', JSON.stringify(completedList));
    } catch (e) {
      console.error('Failed to sync completed list with localStorage', e);
    }
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('bcc_acex_hours', acexHours.toString());
  }, [acexHours]);

  useEffect(() => {
    localStorage.setItem('bcc_acc_hours', accHours.toString());
  }, [accHours]);

  // --- CÁLCULO DE RELAÇÕES ---
  const dependentsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    subjects.forEach(s => {
      s.prereqs.forEach(pre => {
        if (!map[pre]) map[pre] = [];
        map[pre].push(s.id);
      });
    });
    return map;
  }, [subjects]);

  const isUnlocked = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject || subject.prereqs.length === 0) return true;
    return subject.prereqs.every(preId => {
      const pre = subjects.find(s => s.id === preId);
      return pre && pre.status === 'concluido';
    });
  };

  // --- CÁLCULO DAS COORDENADAS DOS CONECTORES (SETAS DE PRÉ-REQUISITOS / LIBERAÇÕES) ---
  const getConnectorPoints = (sourceId: string, targetId: string, containerEl: HTMLElement) => {
    const sourceEl = document.getElementById(`subject-card-${sourceId}`);
    const targetEl = document.getElementById(`subject-card-${targetId}`);
    if (!sourceEl || !targetEl || sourceEl.offsetParent === null || targetEl.offsetParent === null) return null;

    const containerRect = containerEl.getBoundingClientRect();
    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    const srcLeft = sourceRect.left - containerRect.left + containerEl.scrollLeft;
    const srcTop = sourceRect.top - containerRect.top + containerEl.scrollTop;
    const srcRight = srcLeft + sourceRect.width;
    const srcHeight = sourceRect.height;

    const tgtLeft = targetRect.left - containerRect.left + containerEl.scrollLeft;
    const tgtTop = targetRect.top - containerRect.top + containerEl.scrollTop;
    const tgtRight = tgtLeft + targetRect.width;
    const tgtHeight = targetRect.height;

    let startX = srcRight;
    let startY = srcTop + srcHeight / 2;
    let endX = tgtLeft;
    let endY = tgtTop + tgtHeight / 2;

    if (tgtLeft + 5 < srcLeft) {
      startX = srcLeft;
      endX = tgtRight;
    } else if (Math.abs(srcLeft - tgtLeft) < 15) {
      startX = srcLeft + sourceRect.width / 2;
      endX = tgtLeft + targetRect.width / 2;
      if (tgtTop > srcTop) {
        startY = srcTop + srcHeight;
        endY = tgtTop;
      } else {
        startY = srcTop;
        endY = tgtTop + tgtHeight;
      }
    }

    return { startX, startY, endX, endY };
  };

  const getCurvePath = (startX: number, startY: number, endX: number, endY: number) => {
    const dx = endX - startX;
    const dy = endY - startY;

    const angle = Math.atan2(dy, dx);
    const offset = 8;
    const targetX = endX - Math.cos(angle) * offset;
    const targetY = endY - Math.sin(angle) * offset;

    const controlOffset = Math.max(30, Math.abs(dx) * 0.4);

    let cp1x = startX;
    let cp1y = startY;
    let cp2x = targetX;
    let cp2y = targetY;

    if (Math.abs(dx) > 20) {
      cp1x = startX + (dx > 0 ? controlOffset : -controlOffset);
      cp2x = targetX - (dx > 0 ? controlOffset : -controlOffset);
    } else {
      const verticalControlOffset = Math.max(20, Math.abs(dy) * 0.3);
      cp1y = startY + (dy > 0 ? verticalControlOffset : -verticalControlOffset);
      cp2y = targetY - (dy > 0 ? verticalControlOffset : -verticalControlOffset);
    }

    return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetX} ${targetY}`;
  };

  const updateArrowCoordinates = () => {
    const container = document.getElementById('matriz-scroll-container');
    const active = hoveredSubject || selectedSubject;

    if (!container || !active || isMobileGrid) {
      setArrows([]);
      setSvgSize({ width: 0, height: 0 });
      return;
    }

    setSvgSize({
      width: container.scrollWidth,
      height: container.scrollHeight
    });

    const newArrows: typeof arrows = [];

    active.prereqs.forEach(preId => {
      const points = getConnectorPoints(preId, active.id, container);
      if (points) {
        const path = getCurvePath(points.startX, points.startY, points.endX, points.endY);
        newArrows.push({
          id: `${preId}-${active.id}`,
          type: 'prereq',
          path
        });
      }
    });

    const deps = dependentsMap[active.id] || [];
    deps.forEach(depId => {
      const points = getConnectorPoints(active.id, depId, container);
      if (points) {
        const path = getCurvePath(points.startX, points.startY, points.endX, points.endY);
        newArrows.push({
          id: `${active.id}-${depId}`,
          type: 'dependent',
          path
        });
      }
    });

    setArrows(newArrows);
  };

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      updateArrowCoordinates();
    });

    window.addEventListener('resize', updateArrowCoordinates);

    return () => {
      cancelAnimationFrame(handle);
      window.removeEventListener('resize', updateArrowCoordinates);
    };
  }, [hoveredSubject, selectedSubject, isMobileGrid, searchQuery, filterType, filterStatus, subjects, dependentsMap]);

  // --- ACÇÕES ---
  const toggleSubjectStatus = (id: string) => {
    setSubjects(prev => prev.map(s => {
      if (s.id === id) {
        let nextStatus: 'pendente' | 'cursando' | 'concluido' = 'pendente';
        if (s.status === 'pendente') nextStatus = 'cursando';
        else if (s.status === 'cursando') nextStatus = 'concluido';
        return { ...s, status: nextStatus, grade: nextStatus === 'concluido' ? s.grade : '' };
      }
      return s;
    }));
  };

  const setSubjectStatus = (id: string, status: 'pendente' | 'cursando' | 'concluido') => {
    setSubjects(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, status, grade: status === 'concluido' ? s.grade : '' };
      }
      return s;
    }));
  };

  const handleGradeChange = (id: string, gradeVal: string) => {
    let val = gradeVal.replace(',', '.');
    if (val === '' || (!isNaN(Number(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 10)) {
      setSubjects(prev => prev.map(s => {
        if (s.id === id) {
          return { ...s, grade: val };
        }
        return s;
      }));
    }
  };

  const resetProgress = () => {
    setSubjects(INITIAL_SUBJECTS.map(s => ({ ...s, status: 'pendente', grade: '' })));
    setAcexHours(0);
    setAccHours(0);
    setSelectedSubject(null);
    setShowResetConfirm(false);
  };

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ subjects, acexHours, accHours }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "bcc_progresso_matriz.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.subjects && Array.isArray(parsed.subjects)) {
          setSubjects(parsed.subjects);
          if (parsed.acexHours !== undefined) setAcexHours(parsed.acexHours);
          if (parsed.accHours !== undefined) setAccHours(parsed.accHours);
          alert("Progresso importado com sucesso!");
        } else {
          alert("Formato de ficheiro inválido.");
        }
      } catch (err) {
        alert("Erro ao ler o ficheiro.");
      }
    };
  };

  // --- CÁLCULO DE ESTATÍSTICAS ---
  const stats = useMemo(() => {
    let completedRegularHours = 0;
    let completedOptativeHours = 0;

    subjects.forEach(s => {
      if (s.status === 'concluido') {
        if (s.type === 'optativa') {
          completedOptativeHours += s.hours;
        } else {
          completedRegularHours += s.hours;
        }
      }
    });

    const completedAcademicHours = completedRegularHours + completedOptativeHours;
    const currentAcex = Math.min(320, acexHours);
    const currentAcc = Math.min(90, accHours);
    const totalCompletedPlusExtracurricular = completedAcademicHours + currentAcex + currentAcc;
    const progressPercent = Math.min(100, (totalCompletedPlusExtracurricular / 3200) * 100);

    return {
      completedAcademicHours,
      totalCompletedPlusExtracurricular,
      progressPercent,
      completedRegularHours,
      completedOptativeHours
    };
  }, [subjects, acexHours, accHours]);

  // Função para normalizar texto removendo acentos
  const normalizeText = (text: string) => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  };

  // --- DISCIPLINAS FILTRADAS ---
  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => {
      const matchesSearch = normalizeText(s.name).includes(normalizeText(searchQuery));
      const matchesType = filterType === 'todos' || s.type === filterType;
      
      let matchesStatus = true;
      if (filterStatus === 'concluido') matchesStatus = s.status === 'concluido';
      else if (filterStatus === 'cursando') matchesStatus = s.status === 'cursando';
      else if (filterStatus === 'pendente') matchesStatus = s.status === 'pendente';
      else if (filterStatus === 'disponivel') matchesStatus = s.status === 'pendente' && isUnlocked(s.id);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [subjects, searchQuery, filterType, filterStatus]);

  const periods = useMemo(() => {
    const list = Array.from({ length: 9 }, (_, i) => i + 1);
    return list.map(pNum => {
      const periodSubjects = subjects.filter(s => s.period === pNum);
      const totalPeriodHours = periodSubjects.reduce((acc, s) => acc + s.hours, 0);
      const completedPeriodHours = periodSubjects
        .filter(s => s.status === 'concluido')
        .reduce((acc, s) => acc + s.hours, 0);

      return {
        number: pNum,
        subjects: periodSubjects,
        totalHours: totalPeriodHours,
        completedHours: completedPeriodHours
      };
    });
  }, [subjects]);

  // --- MAPAS DE CORES ---
  const typeLabels: Record<string, { name: string, bg: string, border: string, text: string }> = {
    basico: { name: 'Núcleo Básico', bg: 'bg-orange-100 dark:bg-orange-950/40', border: 'border-orange-400 dark:border-orange-800', text: 'text-orange-900 dark:text-orange-200' },
    computacao: { name: 'Núcleo de Computação', bg: 'bg-slate-100 dark:bg-slate-800/40', border: 'border-slate-400 dark:border-slate-700', text: 'text-slate-800 dark:text-slate-200' },
    optativa: { name: 'Optativa', bg: 'bg-blue-100 dark:bg-blue-950/40', border: 'border-blue-400 dark:border-blue-800', text: 'text-blue-900 dark:text-blue-200' },
    estagio: { name: 'Estágio', bg: 'bg-amber-100 dark:bg-amber-950/40', border: 'border-amber-400 dark:border-amber-800', text: 'text-amber-900 dark:text-amber-200' },
    outros: { name: 'Outros/Metodologia', bg: 'bg-slate-100 dark:bg-slate-800/40', border: 'border-slate-400 dark:border-slate-700', text: 'text-slate-800 dark:text-slate-200' }
  };

  const getSubjectRelationship = (subjectId: string) => {
    const active = hoveredSubject || selectedSubject;
    if (!active) return 'none';
    if (active.id === subjectId) return 'self';
    if (active.prereqs.includes(subjectId)) return 'prereq';
    if (dependentsMap[active.id]?.includes(subjectId)) return 'dependent';
    return 'unrelated';
  };

  const getSubjectStatus = (s: Subject) => {
    if (schedule && s.code) {
      const inSchedule = schedule.some(d => d.code === s.code);
      if (inSchedule && s.status === 'pendente') {
        return 'cursando';
      }
    }
    return s.status;
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col antialiased transition-colors duration-300">
      {/* HEADER */}
      <Navbar
        setView={setView}
        title="Matriz Curricular"
        course={course}
        darkMode={darkMode}
        themePreference={themePreference}
        cycleTheme={cycleTheme}
      />


      {/* AJUDA / LEGENDA COMPACTA (Removido e renderizado como Modal) */}

      {/* FILTROS E PESQUISA */}
      <section className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 py-3 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-3">
          {/* Caixa de Pesquisa */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por nome de disciplina..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
            />
          </div>

          {/* Filtros de Tipos e Estados */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 w-full sm:w-auto">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-slate-500 hidden sm:inline">Área:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="focus:outline-none bg-transparent cursor-pointer font-medium text-slate-700 dark:text-slate-300 text-xs w-full"
              >
                <option value="todos" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Todas as Áreas</option>
                <option value="basico" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Núcleo Básico</option>
                <option value="computacao" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Núcleo Computação</option>
                <option value="optativa" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Optativas</option>
                <option value="estagio" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Estágio</option>
                <option value="outros" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Metodologia / Outros</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 w-full sm:w-auto">
              <CheckCircle className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-slate-500 hidden sm:inline">Estado:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="focus:outline-none bg-transparent cursor-pointer font-medium text-slate-700 dark:text-slate-300 text-xs w-full"
              >
                <option value="todos" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Todos os Estados</option>
                <option value="concluido" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Concluídas</option>
                <option value="cursando" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Acursando</option>
                <option value="pendente" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Pendentes</option>
                <option value="disponivel" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Desbloqueadas para Cursar</option>
              </select>
            </div>

            {/* Alternar Vista para Mobile */}
            <button
              onClick={() => setIsMobileGrid(!isMobileGrid)}
              className="md:hidden flex items-center gap-1.5 text-xs bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 w-full sm:w-auto justify-center"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{isMobileGrid ? "Ver Grade Larga" : "Ver Lista Compacta"}</span>
            </button>

            {/* Ajuda / Legenda & Limpar Progresso */}
            <button 
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-1.5 text-xs bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 w-full sm:w-auto justify-center shrink-0 cursor-pointer font-semibold shadow-xs"
              title="Mostrar legenda e ajuda"
            >
              <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
              <span>Ajuda / Legenda</span>
            </button>

            <button 
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 text-xs bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 w-full sm:w-auto justify-center shrink-0 cursor-pointer font-semibold shadow-xs"
              title="Limpar progresso completo da matriz"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Limpar Progresso</span>
            </button>
          </div>
        </div>
      </section>

      {/* ÁREA PRINCIPAL: CONTEÚDO DA MATRIZ */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 flex flex-col gap-6 pb-12 pt-6 items-center">
        
        {/* LADO ESQUERDO: A MATRIZ CURRICULAR */}
        <div className="w-full min-w-0">
          <div 
            id="matriz-scroll-container"
            className={`
              relative
              ${isMobileGrid ? 'grid grid-cols-1 gap-4' : 'flex lg:grid lg:grid-cols-9 gap-3 overflow-x-auto pb-4 max-w-full lg:max-w-none px-1'}
              scroll-smooth md:scroll-auto
            `}
          >
            {/* SVG Connector Overlay */}
            {!isMobileGrid && (hoveredSubject || selectedSubject) && arrows.length > 0 && (
              <svg 
                className="absolute top-0 left-0 pointer-events-none z-20 overflow-visible" 
                style={{ 
                  width: `${svgSize.width}px`, 
                  height: `${svgSize.height}px` 
                }}
              >
                <defs>
                  {/* Arrowhead marker for prerequisites (rose-500) */}
                  <marker
                    id="arrow-prereq"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" className="fill-rose-500 dark:fill-rose-400" />
                  </marker>
                  {/* Arrowhead marker for dependents (teal-500) */}
                  <marker
                    id="arrow-dependent"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" className="fill-teal-500 dark:fill-teal-400" />
                  </marker>
                </defs>
                {arrows.map(arrow => (
                  <path
                    key={arrow.id}
                    d={arrow.path}
                    className={`
                      fill-none stroke-[2] stroke-linecap-round
                      ${arrow.type === 'prereq' 
                        ? 'stroke-rose-500/80 dark:stroke-rose-400/80 [stroke-dasharray:4,4] animate-dash-flow' 
                        : 'stroke-teal-500/80 dark:stroke-teal-400/80 [stroke-dasharray:4,4] animate-dash-flow'
                      }
                    `}
                    markerEnd={`url(#arrow-${arrow.type})`}
                  />
                ))}
              </svg>
            )}

            {periods.map(p => (
              <div 
                key={p.number} 
                className={`
                  flex-shrink-0 flex flex-col gap-3
                  ${isMobileGrid ? 'w-full bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm' : 'w-[140px] md:w-[150px] lg:w-[124px] xl:w-[136px]'}
                `}
              >
                {/* Cabeçalho do Período */}
                <div className="bg-slate-800 dark:bg-slate-800 text-white p-2 text-center rounded-lg shadow-sm relative overflow-hidden">
                  <div className="text-[11px] font-bold uppercase tracking-wider">{p.number}º Período</div>
                  <div className="text-[9px] text-slate-300 mt-0.5 font-medium">
                    {p.completedHours}h / {p.totalHours}h
                  </div>
                  <div className="absolute top-0 bottom-0 left-0 bg-indigo-500/80 -z-10 transition-all duration-300" style={{ width: `${(p.completedHours / p.totalHours) * 100}%` }}></div>
                </div>

                {/* Lista de Disciplinas do Período */}
                <div className={`flex flex-col gap-3 ${isMobileGrid ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 mt-2' : ''}`}>
                  {p.subjects.map(s => {
                    const typeColor = typeLabels[s.type] || typeLabels.basico;
                    const relationship = getSubjectRelationship(s.id);
                    const unlocked = isUnlocked(s.id);
                    const isFiltered = filteredSubjects.some(f => f.id === s.id);
                    const effectiveStatus = getSubjectStatus(s);

                    let highlightClass = 'scale-100 opacity-100 shadow-sm';
                    let baseStyles = effectiveStatus === 'concluido' 
                      ? 'border-emerald-500 dark:border-emerald-600 bg-emerald-100/60 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 shadow-sm' 
                      : effectiveStatus === 'cursando'
                      ? 'border-amber-400 dark:border-amber-500 bg-amber-100/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 ring-1 ring-amber-200 dark:ring-amber-900'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300';
                          
                    let styles = baseStyles;

                    if (hoveredSubject || selectedSubject) {
                      if (relationship === 'self') {
                        styles = `${baseStyles} shadow-md scale-[1.03] z-30`;
                      } else if (relationship === 'prereq') {
                        styles = `${baseStyles} ring-2 ring-rose-200 dark:ring-rose-900 shadow-md scale-[1.02] z-30 border-rose-400`;
                      } else if (relationship === 'dependent') {
                        styles = `${baseStyles} ring-2 ring-teal-200 dark:ring-teal-900 shadow-md scale-[1.02] z-30 border-teal-400`;
                      } else if (relationship === 'unrelated') {
                        highlightClass = 'opacity-30 scale-95 saturate-50 grayscale-[0.5]';
                      }
                    }

                    return (
                      <div
                        key={s.id}
                        id={`subject-card-${s.id}`}
                        onMouseEnter={() => setHoveredSubject(s)}
                        onMouseLeave={() => setHoveredSubject(null)}
                        onClick={() => toggleSubjectStatus(s.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedSubject(s);
                        }}
                        className={`
                          cursor-pointer transition-all duration-300 relative rounded-lg p-3 border flex flex-col justify-between select-none
                          ${styles} ${highlightClass}
                          ${s.id === 'estagio' && !isMobileGrid ? 'h-[250px]' : 'min-h-[96px] xl:min-h-[105px]'}
                          ${!isFiltered ? 'hidden' : ''}
                        `}
                        title="Clique: Alternar estado | Botão direito: Detalhes"
                      >
                        {/* Indicadores de Estado no Canto */}
                        <div className="absolute top-1.5 right-1.5 flex gap-1 items-center z-20">
                          {!unlocked && effectiveStatus === 'pendente' && (
                            <span className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 rounded-full p-0.5" title="Pré-requisitos pendentes">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </span>
                          )}
                          {effectiveStatus === 'concluido' && (
                            <span className="text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-sm border border-emerald-200 dark:border-emerald-800">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                          {effectiveStatus === 'cursando' && (
                            <span className="w-3 h-3 bg-amber-400 dark:bg-amber-500 border border-amber-600 dark:border-amber-700 rounded-full animate-pulse shadow-sm" title="Acursando"></span>
                          )}
                        </div>

                        {/* Nome da Disciplina */}
                        <div className={`text-[10px] xl:text-[11px] font-bold leading-snug break-words pr-5 select-none`}>
                          {s.name}
                        </div>

                        {/* Labels de Relação on Hover */}
                        {(hoveredSubject || selectedSubject) && relationship === 'prereq' && (
                          <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                            Pré-requisito
                          </div>
                        )}
                        {(hoveredSubject || selectedSubject) && relationship === 'dependent' && (
                          <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                            Libera
                          </div>
                        )}

                        {/* Informações Inferiores */}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-black/20 px-1 rounded border border-slate-200 dark:border-slate-700/50">
                            {s.hours}h
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* BARRAS E PAINÉIS DE RESUMO DE CARGA HORÁRIA E REQUISITOS (ACEX/ACC) EM BAIXO */}
          <div className="mt-8 max-w-[1400px] w-full mx-auto">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 px-1 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-500" /> Resumo de Requisitos e Carga Horária
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card de Progresso Geral */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Carga Horária Total</span>
                    <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.totalCompletedPlusExtracurricular}h</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">/ 3200h</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    <span>Concluído</span>
                    <span>{stats.progressPercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-200/45 dark:border-slate-700/50">
                    <div 
                      className="bg-indigo-500 dark:bg-indigo-400 h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${stats.progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Gestão Extracurricular ACEX */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Horas ACEX (Extensão)</span>
                    <span className="text-xs text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded">Meta: 320h</span>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="320" 
                      step="10"
                      value={acexHours} 
                      onChange={(e) => setAcexHours(Number(e.target.value))}
                      className="w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none" 
                    />
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={acexHours}
                      onChange={(e) => setAcexHours(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 px-1.5 py-1 text-center font-bold text-slate-850 dark:text-slate-100 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">h</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-2 flex justify-between">
                  <span>Restantes:</span>
                  <span className="font-semibold text-indigo-650 dark:text-indigo-400">{Math.max(0, 320 - acexHours)}h</span>
                </div>
              </div>

              {/* Gestão Extracurricular ACC */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Horas ACC (Comp.)</span>
                    <span className="text-xs text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded">Meta: 90h</span>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="90" 
                      step="5"
                      value={accHours} 
                      onChange={(e) => setAccHours(Number(e.target.value))}
                      className="w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none" 
                    />
                    <input
                      type="number"
                      min="0"
                      max="500"
                      value={accHours}
                      onChange={(e) => setAccHours(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 px-1.5 py-1 text-center font-bold text-slate-800 dark:text-slate-100 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">h</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-2 flex justify-between">
                  <span>Restantes:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">{Math.max(0, 90 - accHours)}h</span>
                </div>
              </div>
            </div>
            
            {/* Bloco discreto de matérias optativas complementares concluídas */}
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="text-slate-500">Horas Optativas Concluídas:</span>
              <span className="text-indigo-600 dark:text-indigo-400">{stats.completedOptativeHours}h <span className="text-slate-400">/ 480h</span></span>
            </div>
          </div>
        </div>



      </main>

      {/* Modal da Disciplina */}
      {selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedSubject(null)}>
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${typeLabels[selectedSubject.type]?.text || 'text-slate-500'}`}>
                  {selectedSubject.period}º Período • {typeLabels[selectedSubject.type]?.name}
                </span>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">{selectedSubject.name}</h3>
              </div>
              <button 
                onClick={() => setSelectedSubject(null)} 
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <div>
              <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Ementa
              </h4>
              <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                {selectedSubject.desc || "Ementa não detalhada."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-5">
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Carga Horária</h4>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 block w-full text-center">
                  {selectedSubject.hours}h
                </span>
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Estado Atual</h4>
                <select
                  value={selectedSubject.status}
                  onChange={(e) => setSubjectStatus(selectedSubject.id, e.target.value as 'pendente' | 'cursando' | 'concluido')}
                  className="text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow appearance-none"
                >
                  <option value="pendente" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Pendente</option>
                  <option value="cursando" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Acursando</option>
                  <option value="concluido" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Concluído</option>
                </select>
              </div>
            </div>

            {/* Pré-requisitos e Dependências */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
              <div>
                <h4 className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  Pré-requisitos 
                  <span className="bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded-full text-[9px]">{selectedSubject.prereqs.length}</span>
                </h4>
                {selectedSubject.prereqs.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {selectedSubject.prereqs.map(preId => {
                      const pre = subjects.find(s => s.id === preId);
                      return (
                        <div 
                          key={preId} 
                          onClick={() => pre && setSelectedSubject(pre)}
                          className="cursor-pointer text-[12px] p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 rounded-lg hover:border-rose-400 dark:hover:border-rose-500 transition-colors flex justify-between items-center group"
                        >
                          <span className="font-medium truncate pr-2" title={pre?.name}>{pre?.name}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-rose-500 flex-shrink-0 transition-colors" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[12px] text-slate-400 dark:text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">Não exige.</div>
                )}
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  Libera 
                  <span className="bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded-full text-[9px]">{dependentsMap[selectedSubject.id]?.length || 0}</span>
                </h4>
                {dependentsMap[selectedSubject.id]?.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {dependentsMap[selectedSubject.id].map(depId => {
                      const dep = subjects.find(s => s.id === depId);
                      return (
                        <div 
                          key={depId} 
                          onClick={() => dep && setSelectedSubject(dep)}
                          className="cursor-pointer text-[12px] p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 rounded-lg hover:border-teal-400 dark:hover:border-teal-500 transition-colors flex justify-between items-center group"
                        >
                          <span className="font-medium truncate pr-2" title={dep?.name}>{dep?.name}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-teal-500 flex-shrink-0 transition-colors" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[12px] text-slate-400 dark:text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">Não liberta outras matérias.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Limpar Progresso */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowResetConfirm(false)}>
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/40 rounded-full flex items-center justify-center mb-4">
                <RotateCcw className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Limpar Todo o Progresso?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Esta ação irá repor todo o progresso das disciplinas (pendentes, em curso e concluídas), incluindo as horas extracurriculares (ACEX e ACC). Esta operação não pode ser desfeita.
              </p>
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-transparent dark:border-slate-700 cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={resetProgress}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Confirmar Limpar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ajuda / Legenda */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowHelp(false)}>
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Ajuda & Cores da Grade</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Guia de funcionamento e fluxograma</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHelp(false)} 
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Como interagir?
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Clique único:</strong> Altera o estado da disciplina sequencialmente (Pendente → Cursando → Concluída).</li>
                  <li><strong>Botão direito ou toque longo:</strong> Abre o painel de detalhes com a ementa, pré-requisitos e libertações.</li>
                  <li><strong>Passar o cursor (Hover):</strong> Realça os <strong>pré-requisitos (borda vermelha)</strong> e as disciplinas que ela <strong>libera/desbloqueia (borda verde)</strong>.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Código de Cores do Progresso
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg border border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0"></span>
                    <span>Concluída</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 flex items-center gap-2 font-medium">
                    <span className="w-2.5 h-2.5 bg-amber-400 rounded-full shrink-0 animate-pulse"></span>
                    <span>Acursando</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium">
                    <span className="w-2.5 h-2.5 bg-slate-400 rounded-full shrink-0"></span>
                    <span>Pendente</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-150 dark:border-slate-800">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Alerta de Bloqueio ⚠️
                </h4>
                <p className="text-slate-500 dark:text-slate-400">
                  Um ícone de alerta em formato de triângulo significa que a disciplina possui pré-requisitos pendentes no fluxo que ainda não foram marcados como concluídos.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
