-- The academic calendar is now a static PDF embedded in the website.
-- No CASCADE: unrelated objects must never be removed by this migration.
drop table if exists public.academic_calendars;
