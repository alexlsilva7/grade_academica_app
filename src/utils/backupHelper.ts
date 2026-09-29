// Backup and restore utility for all customized user data.
const staticKeys = [
    'themePreference',
    'selectedCourse',
    'selectedSemester',
    'view_preference',
    'saved_gradeTitle',
    'saved_selectedPeriod',
    'saved_selectedProfile',
    'saved_disciplinesList',
    'completedDisciplines',
    'savedGrades',
    'bcc_matriz_progress',
    'bcc_matriz_progress_antiga',
    'bcc_matrix_version',
    'bcc_acex_hours',
    'bcc_acc_hours'
];

const staticKeySet = new Set(staticKeys);

export function isBackupStorageKey(key: string): boolean {
  return staticKeySet.has(key)
    || key.startsWith('schedule_')
    || key.startsWith('selected_profile_')
    || key.startsWith('disciplines_selectedProfile_')
    || key.startsWith('matrix_version_')
    || /^[a-z0-9_-]+_(?:matriz_progress|acex_hours|acc_hours)_.+$/i.test(key)
    || /^completedDisciplines_[a-z0-9_-]+_.+$/i.test(key);
}

export function collectBackupData(storage: Pick<Storage, 'length' | 'key' | 'getItem'>): Record<string, string | null> {
  const data: Record<string, string | null> = {};
  for (const key of staticKeys) data[key] = storage.getItem(key);

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && isBackupStorageKey(key)) data[key] = storage.getItem(key);
  }

  return data;
}

export function restoreBackupData(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
  const entries = Object.entries(parsed as Record<string, unknown>);
  if (!entries.length || entries.some(([key, value]) => isBackupStorageKey(key) && value !== null && typeof value !== 'string')) return false;
  const accepted = entries.filter(([key, value]) => isBackupStorageKey(key) && (value === null || typeof value === 'string'));
  if (!accepted.length) return false;

  const previous = new Map(accepted.map(([key]) => [key, storage.getItem(key)]));
  try {
    for (const [key, value] of accepted) {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value as string);
    }
    return true;
  } catch {
    for (const [key, value] of previous) {
      try {
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      } catch {}
    }
    return false;
  }
}

export function exportAllUserData() {
  const data = collectBackupData(localStorage);
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "my_ufape_backup.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function importAllUserData(file: File, onComplete: () => void) {
  const fileReader = new FileReader();
  fileReader.readAsText(file, "UTF-8");
  fileReader.onload = (event) => {
    try {
      const parsed: unknown = JSON.parse(event.target?.result as string);
      if (restoreBackupData(localStorage, parsed)) {
        onComplete();
      } else {
        alert("Formato de arquivo de backup inválido.");
      }
    } catch (e) {
      alert("Erro ao ler o ficheiro.");
    }
  };
}
