begin;

select plan(28);

select ok(not has_table_privilege('anon', 'public.courses', 'select'), 'anon cannot read courses');
select ok(not has_table_privilege('anon', 'public.course_curricula', 'select'), 'anon cannot read curricula');
select ok(not has_table_privilege('anon', 'public.course_schedules', 'select'), 'anon cannot read schedules');
select ok(not has_table_privilege('anon', 'public.course_contents', 'select'), 'anon cannot read contents');
select ok(not has_table_privilege('anon', 'public.migration_runs', 'select'), 'anon cannot read migration runs');
select ok(not has_table_privilege('anon', 'public.migration_items', 'select'), 'anon cannot read migration items');

select ok(not has_table_privilege('authenticated', 'public.courses', 'select'), 'authenticated users cannot read courses directly');
select ok(not has_table_privilege('authenticated', 'public.course_curricula', 'select'), 'authenticated users cannot read curricula directly');
select ok(not has_table_privilege('authenticated', 'public.course_schedules', 'select'), 'authenticated users cannot read schedules directly');
select ok(not has_table_privilege('authenticated', 'public.course_contents', 'select'), 'authenticated users cannot read contents directly');
select ok(not has_table_privilege('authenticated', 'public.migration_runs', 'select'), 'authenticated users cannot read migration runs directly');
select ok(not has_table_privilege('authenticated', 'public.migration_items', 'select'), 'authenticated users cannot read migration items directly');

select ok(not has_function_privilege('anon', 'public.apply_academic_course_import(uuid,text,jsonb)', 'execute'), 'anon cannot run imports');
select ok(not has_function_privilege('authenticated', 'public.apply_academic_course_import(uuid,text,jsonb)', 'execute'), 'authenticated users cannot run imports');

select ok(has_table_privilege('service_role', 'public.courses', 'select'), 'service_role can read courses');
select ok(has_table_privilege('service_role', 'public.course_curricula', 'select'), 'service_role can read curricula');
select ok(has_table_privilege('service_role', 'public.course_schedules', 'select'), 'service_role can read schedules');
select ok(has_table_privilege('service_role', 'public.course_contents', 'select'), 'service_role can read contents');
select ok(has_table_privilege('service_role', 'public.migration_runs', 'select'), 'service_role can read migration runs');
select ok(has_table_privilege('service_role', 'public.migration_items', 'select'), 'service_role can read migration items');
select ok(has_function_privilege('service_role', 'public.apply_academic_course_import(uuid,text,jsonb)', 'execute'), 'service_role can execute the transactional importer');

insert into public.migration_runs (id, actor_id, status)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'pgtap', 'pending');

insert into public.migration_items (run_id, course_id, source_key, kind, source_file, source_checksum, source_data, destination_snapshot, status)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'rollback_test', 'course:rollback_test', 'course', 'courses_registry.json', 'course-checksum', '{"id":"rollback_test","name":"Rollback Test","shortName":"RT"}', null, 'pending'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'rollback_test', 'curriculum:rollback_test', 'curriculum', 'curriculo_rollback_test.json', 'curriculum-checksum', '{"subjects":[]}', null, 'pending');

select throws_ok(
  $$select public.apply_academic_course_import(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'rollback_test',
    '[{"source_key":"course:rollback_test","source_checksum":"course-checksum","source_data":{"id":"rollback_test","name":"Rollback Test","shortName":"RT"}},{"source_key":"curriculum:rollback_test","source_checksum":"changed-checksum","source_data":{"subjects":[]}}]'::jsonb
  )$$,
  '40001',
  'A origem do item mudou após a prévia: curriculo_rollback_test.json',
  'a failing item aborts the whole course transaction'
);

select ok(not exists(select 1 from public.courses where id = 'rollback_test'), 'course row rolls back after a later item fails');
select is((select status from public.migration_items where source_key = 'course:rollback_test'), 'pending', 'course item state rolls back');
select is((select status from public.migration_items where source_key = 'curriculum:rollback_test'), 'pending', 'failing item state rolls back');

insert into public.migration_runs (id, actor_id, status)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'pgtap', 'pending');

insert into public.migration_items (run_id, course_id, source_key, kind, source_file, source_checksum, source_data, destination_snapshot, status)
values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'ordering_test', 'contents:ordering_test', 'contents', 'conteudos_ordering_test.json', 'contents-checksum', '{"disciplinas":[{"codigo":"X","nome":"X","conteudo_programatico":"X"}]}', null, 'pending'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'ordering_test', 'course:ordering_test', 'course', 'courses_registry.json', 'course-checksum', '{"id":"ordering_test","name":"Ordering Test","shortName":"OT"}', null, 'pending');

select is(
  (public.apply_academic_course_import(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
    'ordering_test',
    '[{"source_key":"contents:ordering_test","source_checksum":"contents-checksum","source_data":{"disciplinas":[{"codigo":"X","nome":"X","conteudo_programatico":"X"}]}},{"source_key":"course:ordering_test","source_checksum":"course-checksum","source_data":{"id":"ordering_test","name":"Ordering Test","shortName":"OT"}}]'::jsonb
  ) ->> 'imported')::integer,
  2,
  'the course is imported first even when the payload lists contents first and omits kind'
);
select ok(exists(select 1 from public.courses where id = 'ordering_test'), 'ordered import creates the parent course');
select ok(exists(select 1 from public.course_contents where course_id = 'ordering_test'), 'ordered import creates dependent contents');

select * from finish();
rollback;
