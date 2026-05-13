export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6; // 1 = Monday, 6 = Saturday
export type TimeSlot = 
  | '07:30 - 08:30' | '08:30 - 09:30' | '09:30 - 10:30' | '10:30 - 11:30' | '11:30 - 12:30'
  | '13:00 - 14:00' | '14:00 - 15:00' | '15:00 - 16:00' | '16:00 - 17:00' | '17:00 - 18:00'
  | '14:00 - 16:00' | '16:00 - 18:00' 
  | '18:30 - 19:20' | '19:20 - 20:10' | '18:30 - 20:10' | '20:10 - 21:00' | '21:00 - 21:50' | '20:10 - 21:50'
  | string;

export interface Session {
  day: DayOfWeek;
  time: TimeSlot;
}

export interface Discipline {
  id: string;
  code?: string;
  name: string;
  professor: string;
  period: number;
  sessions: Session[];
}
