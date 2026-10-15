-- Fee heads and admission rules (15 Oct 2026). Additive only.
--
-- fee_items: today a row is (component, amount_min/max, frequency). Parents
-- compare itemised fees: what is one-time vs yearly vs per-quarter, what is
-- refundable, what is mandatory, and which circular the figure comes from.
-- admission_cycles: add the age rule (reference date + minimum age), how
-- children are selected, the prospectus link and RTE seat count.
--
-- Provenance columns (source_kind, evidence_url, review_state, ...) already
-- exist on both tables from 20261015150000.
--
-- Claude writes this file and stops; a human applies it.

alter table public.fee_items add column if not exists fee_head text;
alter table public.fee_items add column if not exists variant text;
alter table public.fee_items add column if not exists mandatory boolean;
alter table public.fee_items add column if not exists refundable boolean;
alter table public.fee_items add column if not exists basis text;
alter table public.fee_items add column if not exists effective_from date;
alter table public.fee_items add column if not exists notes text;

alter table public.fee_items drop constraint if exists fee_items_fee_head_chk;
alter table public.fee_items add constraint fee_items_fee_head_chk check (
  fee_head is null or fee_head in (
    'registration', 'admission', 'security_deposit', 'tuition', 'annual_charges',
    'development', 'transport', 'meals', 'uniform', 'books', 'activity', 'other'
  )
);

alter table public.fee_items drop constraint if exists fee_items_basis_chk;
alter table public.fee_items add constraint fee_items_basis_chk check (
  basis is null or basis in (
    'fee_circular', 'prospectus', 'school_website', 'school_confirmed', 'public_record', 'estimate'
  )
);

create index if not exists fee_items_school_year_idx
  on public.fee_items (school_id, academic_year, class_code);

alter table public.admission_cycles add column if not exists age_reference_date date;
alter table public.admission_cycles add column if not exists min_age_months integer;
alter table public.admission_cycles add column if not exists max_age_months integer;
alter table public.admission_cycles add column if not exists selection_method text;
alter table public.admission_cycles add column if not exists prospectus_url text;
alter table public.admission_cycles add column if not exists seats_rte integer;

alter table public.admission_cycles drop constraint if exists admission_cycles_selection_method_chk;
alter table public.admission_cycles add constraint admission_cycles_selection_method_chk check (
  selection_method is null or selection_method in (
    'first_come', 'points', 'lottery', 'test', 'interview', 'test_and_interview', 'other'
  )
);

alter table public.admission_cycles drop constraint if exists admission_cycles_age_range_chk;
alter table public.admission_cycles add constraint admission_cycles_age_range_chk check (
  min_age_months is null or max_age_months is null or max_age_months >= min_age_months
);
