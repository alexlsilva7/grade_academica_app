import { Discipline } from './types';
import ealData from './data/eal/horario_eal_2026_1.json';
import eal2026_2Data from './data/eal/horario_eal_2026_2.json';
import admData from './data/adm/horario_adm_2026_1.json';
import bccData from './data/bcc/horario_bcc_2026_1.json';
import mvetData from './data/medicina-veterinaria/horario_medicina-veterinaria_2026_1.json';

export const eal2026_1: Discipline[] = ealData as Discipline[];
export const eal2026_2: Discipline[] = eal2026_2Data as Discipline[];
export const adm2026_1: Discipline[] = admData as Discipline[];
export const bcc2026_1: Discipline[] = bccData as Discipline[];
export const mvet2026_1: Discipline[] = mvetData as Discipline[];
