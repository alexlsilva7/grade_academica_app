import { Discipline } from '../types';
import bccData from '../bcc_dados.json';
import conteudosData from '../conteudos.json';

// Normalize codes to match variations like BCC00022 and BCC0022
const normalizeCode = (c?: string) => c?.toUpperCase().replace(/([A-Z]+)0+([0-9]+)/, '$1$2') || '';

export function hasDisciplineDetails(discipline: Discipline): boolean {
  // Find subject details in JSON by code or name
  const subjectDetails = discipline.code 
    ? bccData.subjects.find(s => s.code === discipline.code) 
    : bccData.subjects.find(s => s.name.toLowerCase() === discipline.name.toLowerCase());

  const possibleCodes = [
    discipline.code,
    subjectDetails?.code,
    ...(subjectDetails?.equivalences?.map(e => e.code) || [])
  ].filter(Boolean) as string[];

  const normalizedPossibleCodes = possibleCodes.map(normalizeCode);

  const finalConteudoDetails = conteudosData.disciplinas.find(d => 
    normalizedPossibleCodes.includes(normalizeCode(d.codigo))
  ) || conteudosData.disciplinas.find(d => 
    d.nome.toLowerCase() === discipline.name.toLowerCase()
  );

  return !!(subjectDetails || finalConteudoDetails);
}
