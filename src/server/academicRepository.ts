import fs from 'node:fs';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CourseMeta, Discipline } from '../types';

export type CourseDetails = {
  course: CourseMeta;
  curriculum: any | null;
  schedule: Discipline[] | null;
  scheduleExtraction: any | null;
  contents: any | null;
  resolvedSemester: string | null;
};

export type SaveCourseInput = {
  id: string;
  name: string;
  shortName?: string;
  curriculum?: any;
  schedule?: any;
  semester?: string;
  scheduleExtraction?: any;
};

export class RepositoryError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

export interface AcademicRepository {
  listCourses(): Promise<CourseMeta[]>;
  getCourse(id: string, semester?: string, strict?: boolean): Promise<CourseDetails | null>;
  saveCourse(input: SaveCourseInput): Promise<CourseMeta>;
  updateCourseMetadata(id: string, name: string, shortName: string): Promise<CourseMeta>;
  updateCourseVisibility(id: string, patch: Partial<CourseMeta>): Promise<CourseMeta>;
  deleteCourse(id: string): Promise<void>;
}

export function cleanCourseId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

export function courseAliases(id: string): string[] {
  if (id === 'eal' || id === 'engenharia-de-alimentos') return ['eal', 'engenharia-de-alimentos'];
  if (id === 'medicina-veterinaria' || id === 'mvet' || id === 'vet') return ['medicina-veterinaria', 'mvet', 'vet'];
  return [id];
}

export function matchCourse(courses: CourseMeta[], identifier: string): CourseMeta | undefined {
  const clean = identifier.toLowerCase();
  return courses.find(course =>
    course.id.toLowerCase() === clean ||
    course.shortName?.toLowerCase() === clean ||
    courseAliases(course.id).includes(clean) ||
    courseAliases(clean).includes(course.id.toLowerCase())
  );
}

export function formatCurriculum(curriculum: any, name: string, shortName?: string): any {
  if (Array.isArray(curriculum)) return { export_date: new Date().toISOString(), subjects: curriculum };
  return {
    ...curriculum,
    export_date: curriculum.export_date || new Date().toISOString(),
    courseName: curriculum.courseName || name,
    courseShortName: curriculum.courseShortName || shortName,
    subjects: curriculum.subjects || []
  };
}

export function extractProfilesFromCurriculum(curriculum: any): string[] {
  if (!curriculum) return [];
  let values: any[] = [];
  if (Array.isArray(curriculum.profiles)) values = curriculum.profiles.map((profile: any) => profile.id || profile.name);
  else if (Array.isArray(curriculum.subjects)) values = curriculum.subjects.map((subject: any) => subject.profile);
  else if (Array.isArray(curriculum)) values = curriculum.map((subject: any) => subject.profile);
  return Array.from(new Set(values.filter((value): value is string =>
    typeof value === 'string' && value.trim().length > 0 && !['optativa', 'sem perfil'].includes(value.trim().toLowerCase())
  )));
}

export function extractProfilesFromSchedule(schedule: any): string[] {
  if (!Array.isArray(schedule)) return [];
  return Array.from(new Set(schedule.map((subject: any) => subject.profile).filter((value: any) =>
    typeof value === 'string' && value.trim().length > 0 && !['optativa', 'sem perfil'].includes(value.trim().toLowerCase())
  )));
}

function mergeProfiles(...lists: string[][]): string[] {
  return Array.from(new Set(lists.flat().filter(Boolean)));
}

function scheduleSemesterFromFile(file: string): string | null {
  return file.match(/_(\d{4})_(\d)\.json$/)?.slice(1).join('.') || null;
}

function emptyDetails(course: CourseMeta): CourseDetails {
  return { course, curriculum: null, schedule: null, scheduleExtraction: null, contents: null, resolvedSemester: null };
}

export class FileAcademicRepository implements AcademicRepository {
  readonly dataDir: string;
  readonly registryPath: string;

  constructor(dataDir = process.env.ACADEMIC_DATA_DIR ? path.resolve(process.env.ACADEMIC_DATA_DIR) : path.join(process.cwd(), 'src', 'data')) {
    this.dataDir = dataDir;
    this.registryPath = path.join(dataDir, 'courses_registry.json');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(this.registryPath)) {
      const initial: CourseMeta[] = [
        { id: 'bcc', name: 'Ciência da Computação', shortName: 'BCC', hasCurriculum: true, hasSchedule: true, semesters: ['2026.1'] },
        { id: 'adm', name: 'Administração', shortName: 'ADM', hasCurriculum: true, hasSchedule: true, semesters: ['2026.1'] },
        { id: 'eal', name: 'Engenharia de Alimentos', shortName: 'EAL', hasCurriculum: true, hasSchedule: true, semesters: ['2026.1'], profiles: ['EAL03'] },
        { id: 'medicina-veterinaria', name: 'Medicina Veterinária', shortName: 'MVET', hasCurriculum: true, hasSchedule: true, semesters: ['2026.1'], profiles: ['MVET03', 'MVET02'] }
      ];
      fs.writeFileSync(this.registryPath, JSON.stringify(initial, null, 2), 'utf-8');
    }
  }

  readRegistry(): CourseMeta[] {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.registryPath, 'utf-8'));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      throw new RepositoryError(`Não foi possível ler courses_registry.json: ${(error as Error).message}`);
    }
  }

  private writeRegistry(courses: CourseMeta[]): void {
    fs.writeFileSync(this.registryPath, JSON.stringify(courses, null, 2), 'utf-8');
  }

  private courseDirectory(course: CourseMeta): string {
    const candidates = courseAliases(course.id).map(alias => path.join(this.dataDir, alias));
    return candidates.find(candidate => fs.existsSync(candidate)) || candidates[0];
  }

  async listCourses(): Promise<CourseMeta[]> {
    const courses = this.readRegistry();
    return courses.map(course => {
      const dir = this.courseDirectory(course);
      const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
      const curriculumFile = files.find(file => file.startsWith('curriculo_') && file.endsWith('.json'));
      let curriculumProfiles: string[] = [];
      if (curriculumFile) {
        try { curriculumProfiles = extractProfilesFromCurriculum(JSON.parse(fs.readFileSync(path.join(dir, curriculumFile), 'utf-8'))); } catch {}
      }
      const scheduleFiles = files.filter(file => file.startsWith('horario_') && file.endsWith('.json'));
      const semesters = scheduleFiles.map(scheduleSemesterFromFile).filter((value): value is string => !!value);
      const latestScheduleFile = [...scheduleFiles].sort().reverse()[0];
      let scheduleProfiles: string[] = [];
      if (latestScheduleFile) {
        try { scheduleProfiles = extractProfilesFromSchedule(JSON.parse(fs.readFileSync(path.join(dir, latestScheduleFile), 'utf-8'))); } catch {}
      }
      const storedSemesters = (course.semesters || []).filter(semester => !semesters.includes(semester));
      return {
        ...course,
        profiles: mergeProfiles(course.profiles || [], curriculumProfiles, scheduleProfiles).length
          ? mergeProfiles(course.profiles || [], curriculumProfiles, scheduleProfiles) : undefined,
        semesters: Array.from(new Set([...storedSemesters, ...semesters])).sort()
      };
    });
  }

  async getCourse(identifier: string, requestedSemester?: string, strict = false): Promise<CourseDetails | null> {
    const registry = this.readRegistry();
    const course = matchCourse(registry, identifier);
    if (!course) return null;
    const details = emptyDetails({ ...course });
    const dir = this.courseDirectory(course);
    if (!fs.existsSync(dir)) return details;
    const files = fs.readdirSync(dir);
    const scheduleFiles = files.filter(file => /^horario_[a-z0-9_-]+_\d{4}_\d\.json$/.test(file));
    const availableSemesters = scheduleFiles.map(scheduleSemesterFromFile).filter((value): value is string => !!value);
    if (availableSemesters.length) details.course.semesters = Array.from(new Set(availableSemesters)).sort();

    const curriculumFile = files.find(file => file.startsWith('curriculo_') && file.endsWith('.json'));
    if (curriculumFile) {
      try {
        details.curriculum = JSON.parse(fs.readFileSync(path.join(dir, curriculumFile), 'utf-8'));
        const profiles = extractProfilesFromCurriculum(details.curriculum);
        if (profiles.length) details.course.profiles = mergeProfiles(details.course.profiles || [], profiles);
      } catch (error) {
        throw new RepositoryError(`Não foi possível ler ${curriculumFile}: ${(error as Error).message}`);
      }
    }

    const contentsFile = files.find(file => file.startsWith('conteudos_') && file.endsWith('.json'));
    if (contentsFile) {
      try { details.contents = JSON.parse(fs.readFileSync(path.join(dir, contentsFile), 'utf-8')); }
      catch (error) { throw new RepositoryError(`Não foi possível ler ${contentsFile}: ${(error as Error).message}`); }
    }

    let selectedFile: string | undefined;
    if (requestedSemester) {
      const normalizedSemester = requestedSemester.replace(/\./g, '_');
      selectedFile = scheduleFiles.find(file => file === `horario_${course.id}_${normalizedSemester}.json` || file.endsWith(`_${normalizedSemester}.json`));
    }
    if (!selectedFile && !(requestedSemester && strict)) {
      const defaultSemester = details.course.visibleSemesters?.[0] || details.course.semesters?.[0];
      if (defaultSemester) {
        const normalizedSemester = defaultSemester.replace(/\./g, '_');
        selectedFile = scheduleFiles.find(file => file === `horario_${course.id}_${normalizedSemester}.json` || file.endsWith(`_${normalizedSemester}.json`));
      }
      if (!selectedFile) selectedFile = [...scheduleFiles].sort().reverse()[0];
    }
    if (selectedFile) {
      details.resolvedSemester = requestedSemester && strict ? requestedSemester : scheduleSemesterFromFile(selectedFile);
      try {
        details.schedule = JSON.parse(fs.readFileSync(path.join(dir, selectedFile), 'utf-8'));
        const reportFile = `extracao_${selectedFile}`;
        if (files.includes(reportFile)) details.scheduleExtraction = JSON.parse(fs.readFileSync(path.join(dir, reportFile), 'utf-8'));
        const profiles = extractProfilesFromSchedule(details.schedule);
        if (profiles.length) details.course.profiles = mergeProfiles(details.course.profiles || [], profiles);
      } catch (error) {
        throw new RepositoryError(`Não foi possível ler ${selectedFile}: ${(error as Error).message}`);
      }
    }
    return details;
  }

  async saveCourse(input: SaveCourseInput): Promise<CourseMeta> {
    const id = cleanCourseId(input.id);
    const directory = path.join(this.dataDir, id);
    fs.mkdirSync(directory, { recursive: true });
    const registry = this.readRegistry();
    const existingIndex = registry.findIndex(course => course.id === id);
    const existing = existingIndex >= 0 ? registry[existingIndex] : undefined;
    const courseName = input.name.trim();
    const shortName = (input.shortName || id.toUpperCase()).trim();
    const semester = (input.semester || '2026.1').replace(/[^a-zA-Z0-9_.-]/g, '_');
    let curriculum = input.curriculum;

    if (curriculum !== undefined && curriculum !== null) {
      curriculum = formatCurriculum(curriculum, courseName, shortName);
      fs.writeFileSync(path.join(directory, `curriculo_${id}.json`), JSON.stringify(curriculum, null, 2), 'utf-8');
    }
    if (Array.isArray(input.schedule)) {
      const schedulePath = path.join(directory, `horario_${id}_${semester.replace(/\./g, '_')}.json`);
      fs.writeFileSync(schedulePath, JSON.stringify(input.schedule, null, 2), 'utf-8');
      if (input.scheduleExtraction !== undefined) {
        fs.writeFileSync(path.join(directory, `extracao_${path.basename(schedulePath)}`), JSON.stringify(input.scheduleExtraction, null, 2), 'utf-8');
      }
    }

    const files = fs.readdirSync(directory);
    const semesters = files.map(scheduleSemesterFromFile).filter((value): value is string => !!value);
    const detectedProfiles = mergeProfiles(
      curriculum ? extractProfilesFromCurriculum(curriculum) : [],
      Array.isArray(input.schedule) ? extractProfilesFromSchedule(input.schedule) : []
    );
    const updated: CourseMeta = {
      ...existing,
      id,
      name: courseName,
      shortName,
      hasCurriculum: curriculum != null || files.some(file => file.startsWith('curriculo_') && file.endsWith('.json')),
      hasSchedule: Array.isArray(input.schedule) || files.some(file => file.startsWith('horario_') && file.endsWith('.json')),
      semesters: Array.from(new Set([...(existing?.semesters || []), ...semesters, ...(Array.isArray(input.schedule) ? [semester.replace(/_/g, '.')] : [])])).sort(),
      profiles: mergeProfiles(existing?.profiles || [], detectedProfiles)
    };
    if (!updated.profiles?.length) delete updated.profiles;
    if (existingIndex >= 0) registry[existingIndex] = updated;
    else registry.push(updated);
    this.writeRegistry(registry);
    return updated;
  }

  async updateCourseMetadata(identifier: string, name: string, shortName: string): Promise<CourseMeta> {
    const registry = this.readRegistry();
    const course = matchCourse(registry, identifier);
    if (!course) throw new RepositoryError('Curso não encontrado.', 404);
    const updated = { ...course, name: name.trim(), shortName: shortName.trim() };
    registry[registry.indexOf(course)] = updated;
    this.writeRegistry(registry);
    return updated;
  }

  async updateCourseVisibility(identifier: string, patch: Partial<CourseMeta>): Promise<CourseMeta> {
    const registry = this.readRegistry();
    const course = matchCourse(registry, identifier);
    if (!course) throw new RepositoryError('Curso não encontrado no registro.', 404);
    const updated = { ...course };
    for (const key of ['hidden', 'showSchedule', 'showDisciplines', 'showMatriz'] as const) {
      if (patch[key] !== undefined) updated[key] = Boolean(patch[key]);
    }
    if (Array.isArray(patch.visibleSemesters)) updated.visibleSemesters = patch.visibleSemesters;
    registry[registry.indexOf(course)] = updated;
    this.writeRegistry(registry);
    return updated;
  }

  async deleteCourse(identifier: string): Promise<void> {
    const registry = this.readRegistry();
    const course = matchCourse(registry, identifier);
    if (!course) throw new RepositoryError('Curso não encontrado no registro.', 404);
    this.writeRegistry(registry.filter(item => item.id !== course.id));
    const directory = this.courseDirectory(course);
    if (fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
  }
}

function throwSupabaseError(error: { message?: string } | null): void {
  if (error) throw new RepositoryError(error.message || 'Falha ao acessar o Supabase.');
}

export class SupabaseAcademicRepository implements AcademicRepository {
  constructor(private client: SupabaseClient<any>) {}

  private async readCourseRows(): Promise<CourseMeta[]> {
    const { data, error } = await this.client.from('courses').select('id,data').order('id');
    throwSupabaseError(error);
    return (data || []).map((row: any) => ({ ...(row.data || {}), id: row.id } as CourseMeta));
  }

  async listCourses(): Promise<CourseMeta[]> {
    const courses = await this.readCourseRows();
    const [curriculumResult, scheduleResult] = await Promise.all([
      this.client.from('course_curricula').select('course_id,data'),
      this.client.from('course_schedules').select('course_id,semester,data')
    ]);
    throwSupabaseError(curriculumResult.error);
    throwSupabaseError(scheduleResult.error);
    return courses.map(course => {
      const curriculum = curriculumResult.data?.find((row: any) => row.course_id === course.id)?.data;
      const schedules = (scheduleResult.data || []).filter((row: any) => row.course_id === course.id);
      return {
        ...course,
        profiles: mergeProfiles(course.profiles || [], extractProfilesFromCurriculum(curriculum), ...schedules.map((row: any) => extractProfilesFromSchedule(row.data))),
        semesters: Array.from(new Set([...(course.semesters || []), ...schedules.map((row: any) => row.semester)])).sort()
      };
    });
  }

  async getCourse(identifier: string, requestedSemester?: string, strict = false): Promise<CourseDetails | null> {
    const courses = await this.readCourseRows();
    const course = matchCourse(courses, identifier);
    if (!course) return null;
    const [curriculumResult, contentsResult, schedulesResult] = await Promise.all([
      this.client.from('course_curricula').select('data').eq('course_id', course.id).maybeSingle(),
      this.client.from('course_contents').select('data').eq('course_id', course.id).maybeSingle(),
      this.client.from('course_schedules').select('semester,data,extraction').eq('course_id', course.id).order('semester')
    ]);
    throwSupabaseError(curriculumResult.error);
    throwSupabaseError(contentsResult.error);
    throwSupabaseError(schedulesResult.error);
    const schedules = schedulesResult.data || [];
    const semesters = schedules.map((row: any) => row.semester);
    const updatedCourse = { ...course, semesters: Array.from(new Set([...(course.semesters || []), ...semesters])).sort() };
    let selected = requestedSemester ? schedules.find((row: any) => row.semester === requestedSemester) : undefined;
    if (!selected && !(requestedSemester && strict)) {
      const defaultSemester = updatedCourse.visibleSemesters?.[0] || updatedCourse.semesters?.[0];
      selected = schedules.find((row: any) => row.semester === defaultSemester) || schedules[schedules.length - 1];
    }
    const schedule = selected?.data ?? null;
    const profiles = mergeProfiles(
      updatedCourse.profiles || [],
      extractProfilesFromCurriculum(curriculumResult.data?.data),
      extractProfilesFromSchedule(schedule)
    );
    updatedCourse.profiles = profiles.length ? profiles : undefined;
    return {
      course: updatedCourse,
      curriculum: curriculumResult.data?.data ?? null,
      contents: contentsResult.data?.data ?? null,
      schedule,
      scheduleExtraction: selected?.extraction ?? null,
      resolvedSemester: schedule ? (requestedSemester && strict ? requestedSemester : selected?.semester ?? null) : null
    };
  }

  async saveCourse(input: SaveCourseInput): Promise<CourseMeta> {
    const id = cleanCourseId(input.id);
    const previous = await this.getCourse(id);
    const courseName = input.name.trim();
    const shortName = (input.shortName || id.toUpperCase()).trim();
    let curriculum = input.curriculum;
    if (curriculum !== undefined && curriculum !== null) curriculum = formatCurriculum(curriculum, courseName, shortName);

    const existingSemesters = previous?.course.semesters || [];
    const semester = (input.semester || '2026.1').replace(/_/g, '.');
    const nextCourse: CourseMeta = {
      ...(previous?.course || {} as CourseMeta),
      id,
      name: courseName,
      shortName,
      hasCurriculum: curriculum != null || Boolean(previous?.curriculum),
      hasSchedule: Array.isArray(input.schedule) || Boolean(previous?.course.hasSchedule),
      semesters: Array.from(new Set([...existingSemesters, ...(Array.isArray(input.schedule) ? [semester] : [])])).sort(),
      profiles: mergeProfiles(
        previous?.course.profiles || [],
        curriculum ? extractProfilesFromCurriculum(curriculum) : [],
        Array.isArray(input.schedule) ? extractProfilesFromSchedule(input.schedule) : []
      )
    };
    if (!nextCourse.profiles?.length) delete nextCourse.profiles;
    const { error: courseError } = await this.client.from('courses').upsert({ id, data: nextCourse, updated_at: new Date().toISOString() });
    throwSupabaseError(courseError);
    if (curriculum != null) {
      const { error } = await this.client.from('course_curricula').upsert({ course_id: id, data: curriculum, updated_at: new Date().toISOString() });
      throwSupabaseError(error);
    }
    if (Array.isArray(input.schedule)) {
      const normalizedSemester = (input.semester || '2026.1').replace(/_/g, '.');
      const { error } = await this.client.from('course_schedules').upsert({
        course_id: id,
        semester: normalizedSemester,
        data: input.schedule,
        extraction: input.scheduleExtraction ?? null,
        updated_at: new Date().toISOString()
      });
      throwSupabaseError(error);
    }
    return nextCourse;
  }

  async updateCourseMetadata(identifier: string, name: string, shortName: string): Promise<CourseMeta> {
    const details = await this.getCourse(identifier);
    if (!details) throw new RepositoryError('Curso não encontrado.', 404);
    const course = { ...details.course, name: name.trim(), shortName: shortName.trim() };
    const { error } = await this.client.from('courses').upsert({ id: course.id, data: course, updated_at: new Date().toISOString() });
    throwSupabaseError(error);
    return course;
  }

  async updateCourseVisibility(identifier: string, patch: Partial<CourseMeta>): Promise<CourseMeta> {
    const details = await this.getCourse(identifier);
    if (!details) throw new RepositoryError('Curso não encontrado no registro.', 404);
    const course = { ...details.course };
    for (const key of ['hidden', 'showSchedule', 'showDisciplines', 'showMatriz'] as const) {
      if (patch[key] !== undefined) course[key] = Boolean(patch[key]);
    }
    if (Array.isArray(patch.visibleSemesters)) course.visibleSemesters = patch.visibleSemesters;
    const { error } = await this.client.from('courses').upsert({ id: course.id, data: course, updated_at: new Date().toISOString() });
    throwSupabaseError(error);
    return course;
  }

  async deleteCourse(identifier: string): Promise<void> {
    const details = await this.getCourse(identifier);
    if (!details) throw new RepositoryError('Curso não encontrado no registro.', 404);
    const { error } = await this.client.from('courses').delete().eq('id', details.course.id);
    throwSupabaseError(error);
  }
}
