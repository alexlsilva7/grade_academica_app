// Backup and restore utility for all customized user data

export function exportAllUserData() {
  const staticKeys = [
    'themePreference',
    'selectedCourse',
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
  
  const data: Record<string, string | null> = {};
  staticKeys.forEach(key => {
    data[key] = localStorage.getItem(key);
  });

  // Also include all dynamically-named keys (courses, profiles, schedules, matrices)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (
        k.startsWith('schedule_') || 
        k.startsWith('selected_profile_') || 
        k.startsWith('disciplines_selectedProfile_') || 
        k.startsWith('matrix_version_')
      )) {
        data[k] = localStorage.getItem(k);
      }
    }
  } catch (e) {
    console.error('Error reading localStorage for backup', e);
  }
  
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
      const parsed = JSON.parse(event.target?.result as string);
      if (typeof parsed === 'object' && parsed !== null) {
        Object.keys(parsed).forEach(key => {
          if (parsed[key] !== null) {
            localStorage.setItem(key, parsed[key]);
          } else {
            localStorage.removeItem(key);
          }
        });
        onComplete();
      } else {
        alert("Formato de arquivo de backup inválido.");
      }
    } catch (e) {
      alert("Erro ao ler o ficheiro.");
    }
  };
}
