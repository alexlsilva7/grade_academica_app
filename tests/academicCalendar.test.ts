import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { CalendarExtraction } from '../src/calendarTypes';
import { calendarToday, calendarUpcoming, calendarEventStatus, calendarIntersects, calendarMonthDays, createCalendarDraft,
  consolidateCalendarDays, isCalendarDate, publishCalendarDraft, safeCalendarUrl, validateCalendarDraft, validateCalendarExtraction } from '../src/utils/academicCalendar';

const source = JSON.parse(fs.readFileSync(new URL('./fixtures/calendario-academico-ufape.json', import.meta.url), 'utf8')) as CalendarExtraction;

test('the supplied extraction validates and repeated visual dates consolidate without hiding disagreements', () => {
  assert.deepEqual(validateCalendarExtraction(source).filter(issue => issue.severity === 'error'), []);
  assert.equal(source.eventos.length, 134);
  const days = consolidateCalendarDays(source);
  assert.equal(days.length, 415);
  const divergent = days.find(day => day.date === '2026-04-28')!;
  assert.equal(divergent.classification, null);
  assert.equal(divergent.needsReview, true);
  assert.deepEqual(divergent.pages, [1, 2, 3]);
  const resolved = consolidateCalendarDays(source, { '2026-04-28': { classification: 'Provas finais', note: 'Conferido na tabela da página 2.' } });
  assert.equal(resolved.find(day => day.date === '2026-04-28')!.classification, 'Provas finais');
  assert.equal(resolved.find(day => day.date === '2026-04-28')!.needsReview, false);
  assert.deepEqual(resolved.find(day => day.date === '2026-04-28')!.classifications, divergent.classifications);
});

test('today uses Sao Paulo even when the UTC date has already changed', () => {
  assert.equal(calendarToday(new Date('2026-10-01T02:59:59Z')), '2026-09-30');
  assert.equal(calendarToday(new Date('2026-10-01T03:00:00Z')), '2026-10-01');
});

test('upcoming includes ongoing enrollment through its final day and future months across semesters', () => {
  const { ongoing, future } = calendarUpcoming(source.eventos, '2026-09-30');
  const enrollment = ongoing.find(event => event.id === 'evento-062')!;
  assert.ok(enrollment);
  assert.equal(calendarEventStatus(enrollment, '2026-09-30'), 'ending');
  assert.equal(calendarEventStatus(enrollment, '2026-10-01'), 'past');
  assert.ok(ongoing.some(event => event.semestres.includes('2026.1')));
  assert.ok(ongoing.some(event => event.semestres.includes('2026.2')));
  assert.equal(future[0].inicio, '2026-10-01');
  assert.ok(future.some(event => event.inicio === '2027-04-12'));
  assert.equal(calendarUpcoming(source.eventos, '2030-01-01').future.length, 0);
  assert.equal(calendarUpcoming(source.eventos, '2030-01-01').ongoing.length, 0);
});

test('date ranges and month grids remain inclusive through year boundaries and leap days', () => {
  const event = { ...source.eventos[0], inicio: '2026-12-21', fimInclusivo: '2027-01-23' };
  assert.equal(calendarIntersects(event, '2027-01-23', '2027-01-23'), true);
  assert.equal(calendarIntersects(event, '2027-01-24', '2027-01-24'), false);
  const grid = calendarMonthDays('2026-10');
  assert.equal(grid[0], '2026-09-27');
  assert.equal(grid.length, 42);
  assert.equal(isCalendarDate('2026-02-29'), false);
  assert.equal(isCalendarDate('2028-02-29'), true);
  assert.equal(isCalendarDate('2026-2-01'), false);
});

test('draft editing preserves the extraction and public projection omits local source paths', () => {
  const draft = createCalendarDraft(source, 'https://ufape.edu.br/calendario.pdf');
  draft.events[0].titulo = 'Título revisado';
  assert.notEqual(draft.source.eventos[0].titulo, draft.events[0].titulo);
  assert.deepEqual(validateCalendarDraft(draft, true).filter(issue => issue.severity === 'error'), []);
  const publication = publishCalendarDraft(draft, '2026-09-30T12:00:00Z');
  assert.equal(publication.events[0].titulo, 'Título revisado');
  assert.equal('arquivo' in publication.document, false);
  assert.equal(JSON.stringify(publication).includes('C:/Users/'), false);
  assert.ok(publication.events.some(event => event.precisaRevisao));
  assert.equal(publication.events.find(event => event.links.length)!.links[0], 'https://www.ufape.edu.br/estagio');
});

test('validation rejects malformed data and unsafe URLs without throwing, but retains undated records for review', () => {
  for (const value of [null, [], {}, { documento: null }, { ...source, eventos: [null, {}] }, { ...source, eventos: [{ ...source.eventos[0], categoria: { toString: 0 } }] }, { ...source, diasMarcados: [null] }]) {
    assert.ok(validateCalendarExtraction(value).some(issue => issue.severity === 'error'));
  }
  const draft = createCalendarDraft(source);
  draft.events[0].inicio = null;
  assert.ok(validateCalendarDraft(draft).some(issue => issue.severity === 'warning'));
  assert.ok(validateCalendarDraft(draft, true).some(issue => issue.path === 'sourceUrl'));
  draft.sourceUrl = 'https://ufape.edu.br/calendario.pdf';
  assert.ok(!publishCalendarDraft(draft, '2026-09-30T12:00:00Z').events.some(e => e.id === draft.events[0].id));
  draft.events[1].inicio = '2026-02-30';
  assert.ok(validateCalendarDraft(draft).some(issue => issue.severity === 'error'));
  assert.equal(safeCalendarUrl('javascript:alert(1)'), null);
  assert.equal(safeCalendarUrl('file:///C:/foo.pdf'), null);
});


test('public projection excludes unrecognized import fields and validation bounds marked-day coverage', () => {
  const draft = createCalendarDraft(source, 'https://ufape.edu.br/calendar.pdf');
  Object.assign(draft.source.documento, { privateMetadata: 'C:/Users/private' });
  Object.assign(draft.events[0], { adminUserId: 'private-user' });
  Object.assign(draft.events[0].origens[0], { arquivo: 'C:/Users/private' });
  Object.assign(draft.source.problemas[0], { privateMetadata: 'secret' });
  const serialized = JSON.stringify(publishCalendarDraft(draft, '2026-09-30T12:00:00Z'));
  assert.equal(serialized.includes('privateMetadata'), false);
  assert.equal(serialized.includes('adminUserId'), false);
  assert.equal(serialized.includes('C:/Users/'), false);
  draft.source.diasMarcados[0].data = '9999-01-01';
  assert.ok(validateCalendarDraft(draft).some(issue => issue.severity === 'error'));
});
