import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { academicCalendarImages } from '../src/data/academicCalendarImages';
import { academicCalendarPdfPage } from '../src/utils/academicCalendarPdf';
import { calendarImageLayout, calendarZoomScroll, clampCalendarZoom } from '../src/utils/calendarImageZoom';

test('all calendar pages have complete responsive WebP assets, including continuation pages', () => {
  assert.equal(academicCalendarImages.length, 16);
  for (const [index, image] of academicCalendarImages.entries()) {
    assert.equal(image.page, index + 1);
    assert.ok(image.height > image.width);
    assert.deepEqual(image.sources.map(source => source.width), [800, 1600, 2400]);
    for (const source of image.sources) {
      const header = Buffer.alloc(12);
      const file = fs.openSync(path.join('public', source.path), 'r');
      try { fs.readSync(file, header, 0, 12, 0); } finally { fs.closeSync(file); }
      assert.equal(header.toString('ascii', 0, 4), 'RIFF');
      assert.equal(header.toString('ascii', 8, 12), 'WEBP');
    }
  }
  assert.equal(academicCalendarImages[academicCalendarPdfPage(new Date('2026-09-30T12:00:00Z')) - 1].page, 8);
});

test('fit-to-width leaves gutters on mobile; desktop zoom creates a scrollable image', () => {
  const mobile = calendarImageLayout(366, 1.414, 1);
  assert.equal(mobile.width, 342);
  assert.equal(mobile.contentWidth, 366);
  assert.equal(mobile.left, 12);
  const desktop = calendarImageLayout(1200, 1.414, 2);
  assert.equal(desktop.width, 2200);
  assert.equal(desktop.contentWidth, 2224);
  assert.equal(clampCalendarZoom(0.1), 1);
  assert.equal(clampCalendarZoom(10), 4);
});

test('pinch zoom preserves the image point under the fingers while their midpoint moves', () => {
  const before = calendarImageLayout(366, 1.414, 1);
  const after = calendarImageLayout(366, 1.414, 2);
  const fromAnchor = { x: 180, y: 240 };
  const toAnchor = { x: 200, y: 270 };
  const scroll = calendarZoomScroll({ viewportWidth: 366, aspectRatio: 1.414, fromZoom: 1, toZoom: 2, scrollLeft: 0, scrollTop: 100, fromAnchor, toAnchor });
  assert.equal((scroll.left + toAnchor.x - after.left) / after.width, (fromAnchor.x - before.left) / before.width);
  assert.equal((scroll.top + toAnchor.y - after.top) / after.height, (100 + fromAnchor.y - before.top) / before.height);
});
