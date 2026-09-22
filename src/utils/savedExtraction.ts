import { parsePipelineConfig, type PipelineConfig } from './pipelineConfig';

export type SavedExtraction = {
  token: string; mode: 'schedule' | 'linear' | 'tree'; model: string; pipeline?: PipelineConfig;
  courseId: string; courseName: string; courseShortName: string; newCourse: boolean; complete?: boolean;
};
const storageKey = 'academic-saved-extraction-v1';

export function loadSavedExtraction(): SavedExtraction | null {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!saved || typeof saved.token !== 'string' || !/^[a-f0-9-]{36}$/i.test(saved.token) ||
      !['schedule', 'linear', 'tree'].includes(saved.mode) || typeof saved.model !== 'string' || typeof saved.courseId !== 'string') return null;
    return { ...saved, pipeline: parsePipelineConfig(saved.pipeline) };
  } catch { return null; }
}

export function persistSavedExtraction(saved: SavedExtraction) {
  // Save before upload/generation: a lost HTTP response must not lose the job ID.
  // Only identifiers and settings go into localStorage; source files stay on the server.
  localStorage.setItem(storageKey, JSON.stringify(saved));
}

export async function extractionResponse(response: Response) {
  const text = await response.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { error: text.slice(0, 300) }; }
  if (!response.ok) throw Object.assign(new Error(data.error || data.details || 'Falha na extração.'), {
    status: response.status, resumeToken: data.resumeToken
  });
  return data;
}

export async function prepareExtraction(saved: SavedExtraction, input: unknown, signal: AbortSignal) {
  persistSavedExtraction(saved);
  return extractionResponse(await fetch('/api/extraction-jobs', { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: saved.token, mode: saved.mode, input }), signal }));
}

export async function resumeExtraction(saved: SavedExtraction, signal: AbortSignal) {
  const endpoint = saved.mode === 'tree' ? 'extract-curriculum-tree' : saved.mode === 'linear' ? 'extract-curriculum' : 'extract-schedule';
  return extractionResponse(await fetch(`/api/${endpoint}`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeToken: saved.token, model: saved.model }), signal }));
}
