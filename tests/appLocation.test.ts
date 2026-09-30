import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAppLocation, parseAppLocation, writeAppLocation } from '../src/utils/appLocation';

test('calendar is an institution-wide route independent of course, semester and profile', () => {
  assert.deepEqual(parseAppLocation('/calendario', '?course=old&semester=2026.2&profile=old'), {
    view: 'calendar', course: null, semester: null, profile: null, invalid: false
  });
  assert.equal(buildAppLocation({ view: 'calendar', course: 'bcc', semester: '2026.1', profile: 'BCC03' }), '/calendario');
});

test('direct academic routes retain course, semester and profile in the parsed location', () => {
  assert.deepEqual(parseAppLocation('/matriz/', '?course=EAL&semester=2026.2&profile=EAL03'), {
    view: 'matriz', course: 'eal', semester: '2026.2', profile: 'EAL03', invalid: false
  });
  assert.deepEqual(parseAppLocation('/disciplinas', '?course=bcc&semester=2026.1'), {
    view: 'disciplines', course: 'bcc', semester: '2026.1', profile: null, invalid: false
  });
});

test('route serialization creates shareable paths and encodes profile names', () => {
  assert.equal(buildAppLocation({ view: 'schedule', course: 'BCC', semester: '2026.1', profile: 'BCC03' }),
    '/schedule?course=bcc&semester=2026.1&profile=BCC03');
  const href = buildAppLocation({ view: 'matriz', course: 'licenciatura-em-letras', semester: null, profile: 'Perfil 4/2024' });
  assert.equal(href, '/matriz?course=licenciatura-em-letras&profile=Perfil+4%2F2024');
  assert.deepEqual(parseAppLocation('/matriz', href.slice(href.indexOf('?'))), {
    view: 'matriz', course: 'licenciatura-em-letras', semester: null, profile: 'Perfil 4/2024', invalid: false
  });
  assert.equal(buildAppLocation({ view: 'disciplines', course: 'bcc', semester: '2026.1', profile: 'all' }),
    '/disciplinas?course=bcc&semester=2026.1');
});

test('invalid paths and parameters are flagged for a safe home fallback', () => {
  assert.deepEqual(parseAppLocation('/missing', '?course=bcc'), {
    view: 'home', course: null, semester: null, profile: null, invalid: true
  });
  assert.deepEqual(parseAppLocation('/schedule', '?course=..&semester=2026.3&profile=%00'), {
    view: 'schedule', course: null, semester: null, profile: null, invalid: true
  });
  assert.deepEqual(parseAppLocation('/admin'), {
    view: 'admin', course: null, semester: null, profile: null, invalid: false
  });
});

test('history writes support Back and Forward without adding duplicate entries', () => {
  const entries = ['/'];
  let index = 0;
  const history = {
    pushState: (_state: unknown, _title: string, url?: string | URL | null) => {
      entries.splice(index + 1);
      entries.push(String(url));
      index++;
    },
    replaceState: (_state: unknown, _title: string, url?: string | URL | null) => {
      entries[index] = String(url);
    }
  } as unknown as History;
  const schedule = { view: 'schedule' as const, course: 'eal', semester: '2026.1', profile: 'EAL03' };
  const matrix = { view: 'matriz' as const, course: 'eal', semester: '2026.1', profile: 'EAL03' };

  assert.equal(writeAppLocation(entries[index], schedule, history, 'push'), true);
  assert.equal(writeAppLocation(entries[index], schedule, history, 'push'), false, 'unchanged route does not add history');
  assert.equal(writeAppLocation(entries[index], matrix, history, 'push'), true);
  index--;
  assert.equal(parseAppLocation(entries[index].split('?')[0], `?${entries[index].split('?')[1]}`).view, 'schedule');
  index++;
  assert.equal(parseAppLocation(entries[index].split('?')[0], `?${entries[index].split('?')[1]}`).view, 'matriz');
});
