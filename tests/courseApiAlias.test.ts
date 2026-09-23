import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

test('Server alias resolution logic for courses', () => {
  const DATA_DIR = path.join(process.cwd(), 'src', 'data');
  const REGISTRY_PATH = path.join(DATA_DIR, 'courses_registry.json');
  const courses = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

  function findCourse(id: string) {
    const cleanId = id.toLowerCase();
    return courses.find((c: any) => 
      c.id === cleanId ||
      (cleanId === 'engenharia-de-alimentos' && c.id === 'eal') ||
      (cleanId === 'eal' && c.id === 'engenharia-de-alimentos') ||
      (cleanId === 'mvet' && c.id === 'medicina-veterinaria') ||
      (cleanId === 'medicina-veterinaria' && c.id === 'mvet')
    );
  }

  function resolveCourseDir(courseMeta: any) {
    let courseDir = path.join(DATA_DIR, courseMeta.id);
    if (!fs.existsSync(courseDir)) {
      if (courseMeta.id === 'eal' && fs.existsSync(path.join(DATA_DIR, 'engenharia-de-alimentos'))) {
        courseDir = path.join(DATA_DIR, 'engenharia-de-alimentos');
      } else if (courseMeta.id === 'engenharia-de-alimentos' && fs.existsSync(path.join(DATA_DIR, 'eal'))) {
        courseDir = path.join(DATA_DIR, 'eal');
      } else if (courseMeta.id === 'medicina-veterinaria' && fs.existsSync(path.join(DATA_DIR, 'mvet'))) {
        courseDir = path.join(DATA_DIR, 'mvet');
      }
    }
    return courseDir;
  }

  // Testing 'eal'
  const ealMeta = findCourse('eal');
  assert.ok(ealMeta, 'eal course found');
  const ealDir = resolveCourseDir(ealMeta);
  assert.ok(fs.existsSync(ealDir), 'eal directory exists');
  const ealFiles = fs.readdirSync(ealDir);
  assert.ok(ealFiles.some(f => f.startsWith('curriculo_') && f.endsWith('.json')), 'curriculum file exists for eal');

  // Testing 'engenharia-de-alimentos' alias
  const ealAliasMeta = findCourse('engenharia-de-alimentos');
  assert.ok(ealAliasMeta, 'engenharia-de-alimentos alias resolves');
  assert.equal(ealAliasMeta.id, 'eal');

  // Testing 'medicina-veterinaria' and 'mvet'
  const mvetMeta = findCourse('medicina-veterinaria');
  assert.ok(mvetMeta, 'medicina-veterinaria found');
  const mvetAliasMeta = findCourse('mvet');
  assert.ok(mvetAliasMeta, 'mvet alias resolves');
});
