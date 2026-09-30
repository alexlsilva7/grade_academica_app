export type AppView = 'home' | 'schedule' | 'matriz' | 'disciplines' | 'admin' | 'calendar';

export type AppLocation = {
  view: AppView;
  course: string | null;
  semester: string | null;
  profile: string | null;
  invalid?: boolean;
};

const pathByView: Record<AppView, string> = {
  home: '/',
  schedule: '/schedule',
  matriz: '/matriz',
  disciplines: '/disciplinas',
  admin: '/admin',
  calendar: '/calendario'
};

export function parseAppLocation(pathname: string, search = ''): AppLocation {
  const path = pathname.replace(/\/+$/, '') || '/';
  const knownPath = Object.entries(pathByView).find(([, value]) => value === path)?.[0] || (path === '/home' ? 'home' : null);
  const view = (knownPath || 'home') as AppView;
  if (view === 'calendar') return { view, course: null, semester: null, profile: null, invalid: false };
  const params = new URLSearchParams(search);
  const rawCourse = params.get('course');
  const rawSemester = params.get('semester');
  const rawProfile = params.get('profile');
  const course = rawCourse && /^[a-z0-9_-]{1,80}$/i.test(rawCourse) ? rawCourse.toLowerCase() : null;
  const semester = rawSemester && /^\d{4}\.[12]$/.test(rawSemester) ? rawSemester : null;
  const profile = rawProfile && rawProfile.length <= 120 && !/[\u0000-\u001f\u007f]/.test(rawProfile) && rawProfile !== 'all'
    ? rawProfile
    : null;
  const invalid = !knownPath
    || (!!rawCourse && !course)
    || (!!rawSemester && !semester)
    || (!!rawProfile && rawProfile !== 'all' && !profile);
  return { view, course: view === 'home' || view === 'admin' ? null : course,
    semester: view === 'home' || view === 'admin' ? null : semester,
    profile: view === 'home' || view === 'admin' ? null : profile, invalid };
}

export function buildAppLocation(location: AppLocation): string {
  const path = pathByView[location.view];
  if (location.view === 'home' || location.view === 'admin' || location.view === 'calendar') return path;
  const params = new URLSearchParams();
  if (location.course && /^[a-z0-9_-]{1,80}$/i.test(location.course)) params.set('course', location.course.toLowerCase());
  if (location.semester && /^\d{4}\.[12]$/.test(location.semester)) params.set('semester', location.semester);
  if (location.profile && location.profile !== 'all' && location.profile.length <= 120 && !/[\u0000-\u001f\u007f]/.test(location.profile)) {
    params.set('profile', location.profile);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function writeAppLocation(
  currentHref: string,
  location: AppLocation,
  history: Pick<History, 'pushState' | 'replaceState'>,
  mode: 'push' | 'replace'
): boolean {
  const nextHref = buildAppLocation(location);
  if (currentHref === nextHref) return false;
  history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', nextHref);
  return true;
}
