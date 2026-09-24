import { Discipline } from '../types';

export type ShiftType = 'manha' | 'tarde' | 'noite';

export interface CanonicalBlock {
  id: string;
  label: string;
  start: number; // in minutes from 00:00
  end: number;   // in minutes from 00:00
  shift: ShiftType;
}

export const CANONICAL_BLOCKS: CanonicalBlock[] = [
  // Manhã (5 blocos de 1h)
  { id: 'M1', label: '07:30 - 08:30', start: 7 * 60 + 30, end: 8 * 60 + 30, shift: 'manha' },
  { id: 'M2', label: '08:30 - 09:30', start: 8 * 60 + 30, end: 9 * 60 + 30, shift: 'manha' },
  { id: 'M3', label: '09:30 - 10:30', start: 9 * 60 + 30, end: 10 * 60 + 30, shift: 'manha' },
  { id: 'M4', label: '10:30 - 11:30', start: 10 * 60 + 30, end: 11 * 60 + 30, shift: 'manha' },
  { id: 'M5', label: '11:30 - 12:30', start: 11 * 60 + 30, end: 12 * 60 + 30, shift: 'manha' },

  // Tarde (5 blocos de 1h)
  { id: 'T1', label: '13:00 - 14:00', start: 13 * 60, end: 14 * 60, shift: 'tarde' },
  { id: 'T2', label: '14:00 - 15:00', start: 14 * 60, end: 15 * 60, shift: 'tarde' },
  { id: 'T3', label: '15:00 - 16:00', start: 15 * 60, end: 16 * 60, shift: 'tarde' },
  { id: 'T4', label: '16:00 - 17:00', start: 16 * 60, end: 17 * 60, shift: 'tarde' },
  { id: 'T5', label: '17:00 - 18:00', start: 17 * 60, end: 18 * 60, shift: 'tarde' },

  // Noite (2 blocos canônicos de 50min/crédito duplo da UFAPE)
  { id: 'N1', label: '18:30 - 20:10', start: 18 * 60 + 30, end: 20 * 60 + 10, shift: 'noite' },
  { id: 'N2', label: '20:10 - 21:50', start: 20 * 60 + 10, end: 21 * 60 + 50, shift: 'noite' }
];

export function parseMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length >= 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return 0;
}

export function parseSessionInterval(timeStr: string): { start: number; end: number } | null {
  if (!timeStr || !timeStr.includes('-')) return null;
  const [sStr, eStr] = timeStr.split('-').map(t => t.trim());
  return {
    start: parseMinutes(sStr),
    end: parseMinutes(eStr)
  };
}

/**
 * Finds which canonical block a session starts in among the given blocks.
 */
export function findSessionStartBlock(sessionTime: string, blocks: CanonicalBlock[]): CanonicalBlock | null {
  const interval = parseSessionInterval(sessionTime);
  if (!interval || blocks.length === 0) return null;

  // 1. Direct match with block.start (allowing ±15 min tolerance)
  let bestBlock: CanonicalBlock | null = null;
  let minDiff = 30; // within 30 min window

  for (const block of blocks) {
    const diff = Math.abs(block.start - interval.start);
    if (diff < minDiff) {
      minDiff = diff;
      bestBlock = block;
    }
  }

  if (bestBlock) return bestBlock;

  // 2. Fallback: block that contains interval.start
  return blocks.find(b => interval.start >= b.start && interval.start < b.end) || null;
}

/**
 * Calculates how many consecutive blocks from the available blocks list the session covers.
 */
export function calculateBlockSpan(sessionTime: string, startBlockIndex: number, blocks: CanonicalBlock[]): number {
  const interval = parseSessionInterval(sessionTime);
  if (!interval || startBlockIndex < 0 || startBlockIndex >= blocks.length) return 1;

  let span = 1;
  for (let i = startBlockIndex + 1; i < blocks.length; i++) {
    const block = blocks[i];
    // If the next block begins before or around session.end (with 15 min leeway)
    // and belongs to the same shift
    if (block.start < interval.end - 15) {
      span++;
    } else {
      break;
    }
  }

  return span;
}

/**
 * Determines which shifts are active based on the student's schedule or course catalog.
 */
export function getActiveShifts(schedule: Discipline[], catalogList: Discipline[]): Set<ShiftType> {
  const shifts = new Set<ShiftType>();

  const listToInspect = schedule.length > 0 ? schedule : catalogList;

  listToInspect.forEach(d => {
    (d.sessions || []).forEach(s => {
      const interval = parseSessionInterval(s.time);
      if (!interval) return;
      if (interval.start < 12 * 60 + 30) {
        shifts.add('manha');
      } else if (interval.start < 18 * 60) {
        shifts.add('tarde');
      } else {
        shifts.add('noite');
      }
    });
  });

  if (shifts.size === 0) {
    // Default fallback to morning and afternoon
    shifts.add('manha');
    shifts.add('tarde');
  }

  return shifts;
}

export type ShiftFilter = 'auto' | 'all' | 'manha' | 'tarde' | 'noite';

/**
 * Returns the relevant canonical blocks according to filter and active shifts.
 */
export function getDisplayBlocks(
  schedule: Discipline[],
  catalogList: Discipline[],
  filter: ShiftFilter = 'auto'
): CanonicalBlock[] {
  if (filter === 'all') {
    return CANONICAL_BLOCKS;
  }
  if (filter === 'manha') {
    return CANONICAL_BLOCKS.filter(b => b.shift === 'manha');
  }
  if (filter === 'tarde') {
    return CANONICAL_BLOCKS.filter(b => b.shift === 'tarde');
  }
  if (filter === 'noite') {
    return CANONICAL_BLOCKS.filter(b => b.shift === 'noite');
  }

  // 'auto' mode: only shifts that actually have classes
  const activeShifts = getActiveShifts(schedule, catalogList);
  return CANONICAL_BLOCKS.filter(b => activeShifts.has(b.shift));
}
