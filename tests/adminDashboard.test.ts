import test from 'node:test';
import assert from 'node:assert/strict';
import { hydrateCurriculum, syncCatalog, serializeCurriculum, dependentNodes } from '../src/utils/adminCurriculum';
import { importDifferences } from '../src/utils/adminImportDiff';
import type { CurriculumSubject, CurriculumProfile, TreeSubjectNode } from '../src/types';

const subject = (id: string, profile = 'P1'): CurriculumSubject => ({ id, profile, code: id, name: id, period: 1, type: 'Obrigatória', workload: { teorica: 60, pratica: 0, extensao: 0, total: 60 }, ementa: 'Conteúdo', prerequisites: [] });
const profile = (id: string): CurriculumProfile => ({ id, name: id, totalHours: null, acexHours: null, accHours: null, optativeHours: null, subjects: [] });

test('catalog edits preserve graph links and update references after code/name edits', () => {
  const original = syncCatalog([subject('A'), { ...subject('B'), prerequisites: [{ id: 'A', code: 'A', name: 'A' }] }], []);
  const edited = syncCatalog(original.subjects.map(item => item.id === 'A' ? { ...item, code: 'NEW', name: 'Renamed', ementa: 'Nova ementa' } : item), original.nodes);
  assert.deepEqual(edited.nodes[1].prereqs, ['A']);
  assert.equal(edited.nodes[0].desc, 'Nova ementa');
  assert.deepEqual(edited.subjects[1].prerequisites, [{ id: 'A', code: 'NEW', name: 'Renamed' }]);
});

test('profiles serialize only their own nodes, including empty profiles and unassigned subjects', () => {
  const normalized = syncCatalog([subject('A'), subject('B', 'P2'), { ...subject('C'), profile: undefined }], []);
  const result = serializeCurriculum(normalized.subjects, normalized.nodes, [profile('P1'), profile('P2'), profile('EMPTY')]);
  assert.deepEqual(result.profiles.map(item => item.subjects.map(node => node.id)), [['A'], ['B'], []]);
  assert.equal(result.treeSubjects.length, 3);
  assert.equal(hydrateCurriculum(result).subjects.length, 3);
});

test('legacy catalogs receive stable IDs scoped by profile and retain optional workload', () => {
  const legacy = [{ ...subject('X'), id: undefined, workload: { teorica: null, pratica: null, extensao: null, semipresencialEad: 20, total: 60 } }, { ...subject('X', 'P2'), id: undefined }];
  const normalized = hydrateCurriculum(legacy);
  assert.notEqual(normalized.nodes[0].id, normalized.nodes[1].id);
  assert.deepEqual(hydrateCurriculum(normalized.subjects).subjects, normalized.subjects);
  assert.equal(normalized.nodes[0].workload?.semipresencialEad, 20);
});

test('legacy profile-only graphs retain every profile and unknown prerequisite information', () => {
  const a: TreeSubjectNode = { id: 'A', code: 'A', name: 'A', period: null, hours: null, type: 'outros', prereqs: null };
  const data = hydrateCurriculum({ subjects: [], profiles: [{ ...profile('P1'), subjects: [a] }, { ...profile('P2'), subjects: [{ ...a, id: 'B' }] }] });
  assert.equal(data.nodes.length, 2);
  assert.equal(data.nodes[0].profile, 'P1');
  assert.equal(data.nodes[1].profile, 'P2');
  assert.equal(data.nodes[0].prereqs, null);
});

test('ambiguous catalog-to-graph matches are rejected rather than silently merged', () => {
  const original = syncCatalog([subject('A')], []);
  assert.throws(() => syncCatalog([{ ...subject('A'), id: undefined }], [original.nodes[0], { ...original.nodes[0], id: 'B' }]), /ambígua/);
});

test('deleting a profile identifies external dependents without blocking internal links', () => {
  const { nodes } = syncCatalog([subject('A'), { ...subject('B'), prerequisites: [{ id: 'A', code: 'A', name: 'A' }] }, { ...subject('C', 'P2'), prerequisites: [{ id: 'A', code: 'A', name: 'A' }] }], []);
  assert.deepEqual(dependentNodes(nodes, new Set(['A', 'B'])).map(node => node.id), ['C']);
});

test('import comparison exposes additions, changes and removals without mutating its inputs', () => {
  const before = [subject('A'), subject('B')];
  const after = [{ ...subject('A'), name: 'Changed' }, subject('C')];
  const snapshot = JSON.stringify({ before, after });
  const changes = importDifferences([{ field: 'curriculumSubjects', before, after }]);
  assert.deepEqual(changes.map(item => item.kind), ['Alteração', 'Remoção', 'Inclusão']);
  assert.equal(JSON.stringify({ before, after }), snapshot);
});
