-- api.public_school_fees: itemised fees for the school page's Fees block.
--
-- Provenance rule (15 Oct 2026): SchoolOye publishes what school admins provide,
-- so every fact carries who supplied it, the evidence and the date. This view
-- exposes only rows a reviewer or the school's own verified flow has moved to
-- review_state = 'published' (see 20261015150000_fact_provenance_layer.sql),
-- and only for published schools. Drafts, rejected, superseded and expired rows
-- never reach the public.
--
-- Must stay owner-run (fee_items has RLS) — same reason as 010_public_schools.sql.
create or replace view api.public_school_fees as
select
  fi.id as fee_id,
  fi.school_id,
  fi.academic_year,
  fi.class_code,
  fi.fee_head,
  fi.component,
  fi.variant,
  fi.amount_min,
  fi.amount_max,
  fi.frequency,
  fi.mandatory,
  fi.refundable,
  fi.basis,
  fi.effective_from,
  fi.notes,
  fi.source_kind,
  fi.evidence_url,
  fi.observed_at,
  fi.valid_to,
  fi.updated_at
from fee_items fi
join schools s on s.id = fi.school_id
where s.status = 'published'
  and fi.review_state = 'published';
