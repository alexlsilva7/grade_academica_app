import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { academicCalendarPdfPage, ACADEMIC_CALENDAR_PDF_PATH } from '../src/utils/academicCalendarPdf';

test('PDF opening selects the monthly table using the current date in Sao Paulo', () => {
  assert.equal(academicCalendarPdfPage(new Date('2026-09-30T12:00:00Z')), 8);
  assert.equal(academicCalendarPdfPage(new Date('2026-10-01T02:59:59Z')), 8);
  assert.equal(academicCalendarPdfPage(new Date('2026-10-01T03:00:00Z')), 9);
  assert.equal(academicCalendarPdfPage(new Date('2026-05-15T12:00:00Z')), 3);
  assert.equal(academicCalendarPdfPage(new Date('2026-11-15T12:00:00Z')), 11);
  assert.equal(academicCalendarPdfPage(new Date('2027-01-01T12:00:00Z')), 13);
  assert.equal(academicCalendarPdfPage(new Date('2025-01-01T12:00:00Z')), 1);
  assert.equal(academicCalendarPdfPage(new Date('2028-01-01T12:00:00Z')), 16);
});

test('the original official PDF is still shipped for download', () => {
  const file = fs.openSync(path.join('public', ACADEMIC_CALENDAR_PDF_PATH), 'r');
  try {
    const header = Buffer.alloc(5);
    fs.readSync(file, header, 0, 5, 0);
    assert.equal(header.toString(), '%PDF-');
  } finally { fs.closeSync(file); }
});
