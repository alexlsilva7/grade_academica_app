import { DayOfWeek, TimeSlot } from './types';

export const DAYS: { id: DayOfWeek; name: string }[] = [
  { id: 1, name: 'Segunda' },
  { id: 2, name: 'Terça' },
  { id: 3, name: 'Quarta' },
  { id: 4, name: 'Quinta' },
  { id: 5, name: 'Sexta' },
  { id: 6, name: 'Sábado' },
];

export const TIMESLOTS: TimeSlot[] = [
  '14:00 - 16:00',
  '16:00 - 18:00',
  '18:30 - 20:10',
  '20:10 - 21:50',
];
