export type DayOfWeek = 1 | 2 | 3 | 4 | 5; // 1 = Monday, 5 = Friday
export type TimeSlot = '14:00 - 16:00' | '16:00 - 18:00' | '18:30 - 20:10' | '20:10 - 21:50';

export interface Session {
  day: DayOfWeek;
  time: TimeSlot;
}

export interface Discipline {
  id: string;
  name: string;
  professor: string;
  period: number;
  sessions: Session[];
}
