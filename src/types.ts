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

export interface Discipline {
  id: string;
  code?: string;
  name: string;
  professor: string;
  period: number;
  profile?: string;
  sessions: Session[];
}

export interface Workload {
  teorica: number;
  pratica: number;
  extensao: number;
  total: number;
}

export interface Prerequisite {
  code: string;
  name: string;
}

export interface CurriculumSubject {
  id?: string;
  code: string;
  name: string;
  type: string;
  period: string | number;
  profile?: string;
  credits?: number;
  workload: Workload;
  prerequisites?: Prerequisite[];
  corequisites?: Prerequisite[];
  equivalences?: Prerequisite[];
  ementa: string;
}

export interface TreeSubjectNode {
  id: string;
  code?: string;
  name: string;
  period: number;
  hours: number;
  type: 'basico' | 'computacao' | 'optativa' | 'estagio' | 'outros' | string;
  prereqs: string[];
  desc?: string;
  equivalences?: Array<{ code: string; name: string; targetProfile?: string }>;
}

export interface CurriculumProfile {
  id: string;
  name: string;
  description?: string;
  validFromSemester?: string;
  totalHours: number;
  acexHours: number;
  accHours: number;
  optativeHours: number;
  mandatoryHours?: number;
  subjects: TreeSubjectNode[];
}

export interface CurriculumData {
  export_date?: string;
  courseName?: string;
  courseShortName?: string;
  activeProfileId?: string;
  profiles?: CurriculumProfile[];
  subjects: CurriculumSubject[];
}

export interface CourseMeta {
  id: string;
  name: string;
  shortName: string;
  hasCurriculum: boolean;
  hasSchedule: boolean;
  semesters?: string[];
  profiles?: string[];
}
