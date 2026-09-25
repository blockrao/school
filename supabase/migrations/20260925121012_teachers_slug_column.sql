-- Missed in the original teachers schema: CLAUDE.md specifies canonical teacher
-- URLs as /teacher/[id]-[slug], the same shape as schools. NOT NULL is safe to
-- add directly — teachers has zero rows (migration just applied, nothing built
-- on top of it yet).
alter table teachers add column slug text not null;
create index teachers_slug_idx on teachers (slug);
