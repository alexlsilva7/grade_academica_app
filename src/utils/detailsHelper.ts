import { Discipline } from '../types';
import bccData from '../data/bcc/curriculo_bcc.json';
import conteudosData from '../data/bcc/conteudos_bcc.json';

import ealData from '../data/eal/curriculo_eal.json';
import mvetData from '../data/medicina-veterinaria/curriculo_medicina-veterinaria.json';
import admData from '../data/adm/curriculo_adm.json';

// Normalize codes to match variations like BCC00022 and BCC0022
const normalizeCode = (c?: string) => c?.toUpperCase().replace(/([A-Z]+)0+([0-9]+)/, '$1$2') || '';

const allSubjectsList: any[] = [
  ...(bccData.subjects || []),
  ...((ealData as any).profiles || []).flatMap((p: any) => p.subjects || []),
  ...((mvetData as any).profiles || []).flatMap((p: any) => p.subjects || []),
  ...(Array.isArray(admData) ? admData : [])
];

export function hasDisciplineDetails(discipline: Discipline): boolean {
  if (!discipline) return false;
  if ((discipline as any).desc || (discipline as any).ementa) return true;

  // Find subject details in JSON by code or name
  const subjectDetails = discipline.code 
    ? allSubjectsList.find(s => s.code === discipline.code) 
    : allSubjectsList.find(s => (s.name || '').toLowerCase() === (discipline.name || '').toLowerCase());

  const possibleCodes = [
    discipline.code,
    subjectDetails?.code,
    ...(subjectDetails?.equivalences?.map(e => e.code) || [])
  ].filter(Boolean) as string[];

  const normalizedPossibleCodes = possibleCodes.map(normalizeCode);

  const finalConteudoDetails = conteudosData.disciplinas.find(d => 
    normalizedPossibleCodes.includes(normalizeCode(d.codigo))
  ) || conteudosData.disciplinas.find(d => 
    d.nome.toLowerCase() === (discipline.name || '').toLowerCase()
  );

  return !!(subjectDetails || finalConteudoDetails);
}
