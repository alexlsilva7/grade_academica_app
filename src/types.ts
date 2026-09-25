export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6; // 1 = Monday, 6 = Saturday
export type TimeSlot = 
  | '07:30 - 08:30' | '08:30 - 09:30' | '09:30 - 10:30' | '10:30 - 11:30' | '11:30 - 12:30'
  | '13:00 - 14:00' | '14:00 - 15:00' | '15:00 - 16:00' | '16:00 - 17:00' | '17:00 - 18:00'
  | '14:00 - 16:00' | '16:00 - 18:00' 
  | '18:30 - 19:20' | '19:20 - 20:10' | '18:30 - 20:10' | '20:10 - 21:00' | '21:00 - 21:50' | '20:10 - 21:50'
  | string;

export interface Session {
  day: DayOfWeek;
  time: TimeSlot;
}

export interface SourceMetadata {
  evidence?: import('./utils/extraction').Evidence[];
  courseName?: string | null;
  semester?: string | null;
  classGroup?: string | null;
}

export interface Discipline extends SourceMetadata {
  id: string;
  code?: string | null;
  name: string;
  professor: string | null;
  period: number | null;
  profile?: string | null;
  sessions: Session[];
}

export interface Workload {
  teorica: number | null;
  pratica: number | null;
  extensao: number | null;
  semipresencialEad?: number | null;
  total: number | null;
}

export interface Prerequisite {
  code: string | null;
  name: string | null;
  id?: string;
}

export interface CurriculumSubject extends SourceMetadata {
  id?: string;
  code: string | null;
  name: string;
  type: string | null;
  period: string | number | null;
  profile?: string | null;
  credits?: number | null;
  workload: Workload;
  prerequisites?: Prerequisite[] | null;
  corequisites?: Prerequisite[] | null;
  equivalences?: Prerequisite[] | null;
  ementa: string | null;
}

export interface TreeSubjectNode extends SourceMetadata {
  id: string;
  code?: string | null;
  name: string;
  period: number | null;
  hours: number | null;
  profile?: string | null;
  academicType?: string | null;
  credits?: number | null;
  workload?: Workload;
  type: 'basico' | 'computacao' | 'optativa' | 'estagio' | 'outros' | string;
  prereqs: string[] | null;
  corequisites?: Prerequisite[] | null;
  desc?: string | null;
  equivalences?: Array<{ code: string; name: string; targetProfile?: string }>;
}

export interface CurriculumProfile {
  id: string;
  name: string | null;
  description?: string;
  validFromSemester?: string;
  totalHours: number | null;
  acexHours: number | null;
  accHours: number | null;
  optativeHours: number | null;
  mandatoryHours?: number | null;
  requisitos?: {
    total?: number;
    acex_extensao?: number;
    acc_complementar?: number;
    optativas?: number;
    obrigatorias?: number;
    [key: string]: any;
  };
  subjects: TreeSubjectNode[];
}

export interface CurriculumData {
  export_date?: string;
  courseName?: string;
  courseShortName?: string;
  institution?: string;
  instituicao?: string;
  requisitos?: {
    total?: number;
    acex_extensao?: number;
    acc_complementar?: number;
    optativas?: number;
    obrigatorias?: number;
    [key: string]: any;
  };
  activeProfileId?: string;
  profiles?: CurriculumProfile[];
  treeSubjects?: TreeSubjectNode[];
  extraction?: import('./utils/extraction').ExtractionReport;
  subjects: CurriculumSubject[];
}

export interface CourseMeta {
  id: string;
  name: string;
  shortName: string;
  hasCurriculum: boolean;
  hasSchedule: boolean;
  semesters?: string[];         // Todos os semestres que existem nos arquivos (ex: ["2026.1", "2026.2"])
  visibleSemesters?: string[];  // Semestres ativos e ordenados. O 1º é o padrão aberto no app!
  profiles?: string[];
  // Controles de visibilidade:
  hidden?: boolean;          // Oculta o curso por completo da tela inicial
  showSchedule?: boolean;    // Exibir/ocultar card de Horário Letivo (padrão: true)
  showDisciplines?: boolean; // Exibir/ocultar card de Disciplinas (padrão: true)
  showMatriz?: boolean;      // Exibir/ocultar card de Matriz Curricular (padrão: true)
}
