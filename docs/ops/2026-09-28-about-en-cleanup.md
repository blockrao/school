# `about_en` content cleanup — 28 Sep 2026

## Reason

Fixing the "About" section heading to distinguish school-supplied text ("From the
school") from SchoolOye's own summary ("About this school") — see the entity-page
increment on the same day — surfaced that several live `about_en` values were not
reader-facing summaries at all. A full audit of every published school with a
non-empty `about_en` (33 rows) found internal research/ops/dedup notes, an
unattributed third-party ranking claim, and promotional adjectives banned by
`docs/guidelines/content-and-trust.md` §4, sitting directly under that heading on
live public pages.

Full audit, classification and the agreed final text for every row were reviewed
and approved in chat before this operation ran; this file is the durable record so
the audit trail doesn't depend on that conversation.

## What changed

24 of 33 published schools with a non-empty `about_en` were updated. 9 were left
untouched. No UI, schema or fee/admissions changes were part of this operation —
`about_en` content only.

### 12 → cleared to `NULL` (no defensible parent-facing content to keep)

| id | slug | old value |
|---|---|---|
| f32bcc3e-3148-49c4-9f9d-1960695c2ec2 | cambridge-court-world-school | Among the highest fee points found in this research (approx. ₹20,280/month) - a useful data point for a fee-comparison feature |
| e7c12c42-1081-40da-ab1c-f802c953fb71 | central-academy-jhotwara | NOT the same school as 'Central Academy, Ambabari' (id 57 in this list) despite the similar name and shared CBS/Central Academy naming - two entirely distinct institutions in different localities |
| 5759d73e-0fac-4297-ab4d-368e98f33969 | delhi-public-school-dps-jaipur | CORRECTED via official CBSE SARAS record: actual address is Jaipur-Ajmer Highway, Bhankrota (pin 303011) - many ranking sites list this school under 'Jagatpura,' which is inaccurate |
| a8b62990-0cd5-426f-94d5-435fb044ecc7 | discovery-international-school | Frequently listed in top-10 CBSE Jaipur roundups |
| 3bb9d58e-31ac-4544-b11e-9bfc43846049 | india-international-school-mansarovar | Frequently listed in top-10 CBSE Jaipur roundups |
| 195b95d8-dc7a-4ee9-9413-985e34384e96 | maheshwari-public-school-ajmer-road-bagru-campus | Second, separately-affiliated campus under the same Maheshwari Samaj trust - do not merge with the Sanganer campus |
| e44d49e2-c65e-48c7-86bc-d559b2165ff4 | sanskar-school-sirsi-road | Distinct from Sanskar Public School, Bassi - do not merge despite the near-identical name |
| 69db418e-7230-42c7-9c39-863775c5bc87 | scotle-high-school | Ranked #1 in one independent UDISE+-based quality-score ranking of Jaipur CBSE schools |
| 310ab37b-e6b5-4bbc-b060-d812e35b7cdc | srn-international-school | Frequently listed in top-10 CBSE Jaipur roundups |
| 3cdbd26c-fa2d-4e88-b69f-06235506c3a1 | tagore-international-school-mansarovar | Possible brand confusion risk: distinct from 'Tagore Public School' (id 7, multiple campuses) already in this list - confirm whether these are related or entirely separate before publishing side by side |
| 2a266b4e-dc5c-406a-b193-165ff686048a | st-xaviers-senior-secondary-school | Jesuit-run. Board affiliation conflicts across sources (CBSE vs. long-standing ICSE reputation) - confirm directly with school |
| 8d2247e0-09aa-4cd0-86e1-aa7187f8c6ce | subodh-public-school | One of Jaipur's larger, longer-established CBSE schools |

The first 10 were internal research/ops/dedup/ranking notes with no defensible
parent-facing remainder. The last 2 were borderline (each had one thin factual
fragment — "Jesuit-run"; the comparative "larger, longer-established" claim) but
were cleared rather than partially kept, on the principle agreed for this cleanup:
an honest empty state beats a fragment that reads oddly alone or an unverifiable
comparative claim.

### 12 → revised to a trimmed factual statement

| id | slug | old value | new value |
|---|---|---|---|
| 252a9fc7-9a05-4d7a-a7ee-d365a248db67 | maharaja-sawai-man-singh-vidyalaya | Bears the name of the Jaipur royal family (Maharaja Sawai Man Singh II) - a genuine heritage-education institution, distinct from the Museum Trust of the same name that runs City Palace | Named after Maharaja Sawai Man Singh II of the Jaipur royal family. |
| 52d54b29-8077-42e4-9aac-ccd99893902a | maharani-gayatri-devi-girls-school-mgd | Founded by Maharani Gayatri Devi of Jaipur; one of the first girls' education institutions in the region, tied directly to the royal family history already documented in the tourism entity list | Founded by Maharani Gayatri Devi of Jaipur. |
| 36be8307-1dfa-4c70-9324-12583bb31cee | maheshwari-public-school-jawahar-nagar-campus | Boys-only. A THIRD distinct Maheshwari Public School campus in Jaipur, alongside the Sanganer (id 47) and Bagru (id 48) campuses - all under the Maheshwari Samaj trust umbrella but separately run and gendered differently | Boys-only campus of the Maheshwari Samaj trust. |
| 0051c60b-0f26-4ac7-a90f-d06fce4d9f39 | maheshwari-public-school-sanganer-campus | Run by The Education Committee of The Maheshwari Samaj, Jaipur - a community/caste-based education trust, common ownership model in Jaipur | Run by the Education Committee of the Maheshwari Samaj, Jaipur. |
| 31d40126-382d-4bf5-87ea-6394f24934cf | podar-world-school | CONFIRMS the Podar Education Network (124 schools nationally, est. 1927) does have a real Jaipur campus - this was flagged as unconfirmed in the prior version of this file | Part of the Podar Education Network (124 schools nationally, established 1927). |
| d61250d2-1b3b-4ff2-b628-2e0585b5e7b8 | ryan-international-school-mansarovar | CONFIRMS Ryan International Group (270,000+ students, 40 cities nationally) does have a real Jaipur campus - this was flagged as unconfirmed in the prior version of this file | Part of the Ryan International Group (270,000+ students, 40 cities nationally). |
| 7f8ff9bc-cadc-49c6-a814-0bc083e4d8f5 | sbioa-public-school | Run by the All India State Bank of India Officers Educational and Welfare Society - a bank-employee-association-founded school, a distinct ownership pattern worth noting for a directory | Run by the All India State Bank of India Officers Educational and Welfare Society. |
| ffce3322-585f-463c-9273-bd171a6d0c03 | shanti-asiatic-school | Part of a school network stretching beyond Rajasthan; positioned as a premier school set apart from the city centre | Part of a school network with campuses beyond Rajasthan. |
| 27ce9244-ee02-471f-851a-394a7635a5f2 | sophia-school | Run by MSA (Missionary Sisters); part of a wider Sophia School network across Rajasthan - distinct campuses, don't merge | Run by MSA (Missionary Sisters); part of a wider Sophia School network across Rajasthan. |
| 2cd746eb-3949-4dbf-b207-ee6c12427b24 | springdales-school-jaipur | Jaipur campus of the well-known Springdales School brand (originally Delhi) | Jaipur campus of the Springdales School group (originally Delhi). |
| 98579e0b-3915-41ce-870b-32381edf08ce | st-xaviers-school-nevta-ib-wing | Distinct IB-specific campus separate from the original St. Xavier's Sr. Sec. School (id 9, C-Scheme) - adds real IB provision beyond the 3 IB schools named in earlier versions of this list | IB-specific campus. |
| 3343e0d6-4cfb-4665-9535-f9b0842e8d75 | the-jaipur-public-school | Official CBSE record: est. school opened 2015, run by Shree R.N.B. Education Sansthan | Opened in 2015; run by Shree R.N.B. Education Sansthan. |

Every revised value uses only facts already present in the old value — nothing was
invented, no adjectives were added back in, and entity-resolution/dedup
information (which campus is which, "don't merge with X") was dropped rather than
rephrased, since that belongs in the entity/relationship layer, not a reader-facing
summary.

### 9 → intentionally untouched (genuine parent-facing content already)

air-force-school-jaipur, gyan-vihar-school, jaipuria-vidyalaya,
janta-girls-public-school, mayoor-school, neerja-modi-school,
rukmani-birla-modern-high-school, st-angela-sophia-senior-secondary-school,
tagore-public-school-vaishali-nagar.

## Verification

Run and confirmed after the update: all 12 `NULL` rows individually checked, all
12 revised rows matched the agreed text character-for-character, all 9 untouched
rows confirmed byte-identical to their pre-cleanup value, and the published-schools
`about_en`-populated count dropped from 33 to 21 (33 − 12), as expected.

## How it was run

Two `UPDATE ... WHERE id IN (...)` statements (by primary key, not slug or pattern
matching) run via the Supabase project's SQL execution path, no schema change, no
migration file — this is a one-time content correction, not a structural change.
No commit in `blockrao/school` corresponds to this operation since it touched data,
not code.

## What this surfaced (product note, not part of this cleanup)

`about_en` has no enforced content contract anywhere in the app today:

- The only stated rule is one line in `docs/guidelines/content-and-trust.md` §3 —
  "About this school" (≤80 words, no adjectives like best, premier, top, leading)
  for the unclaimed case, "From the school" for claimed. It isn't cross-referenced
  from anywhere near where the field is actually edited.
- The ops editor (`/ops/schools/[id]`) presents it as a bare, unlabelled textarea
  with no character count, no hint text and no validation.
- There is no separate column on `schools` for internal research/dedup/QA notes —
  `about_en` was the only free-text field available, which is the likely reason
  research notes ended up here instead of a proper research-notes field.

None of that was fixed in this pass (data cleanup only, per the agreed scope). It's
a candidate for a small, separate increment: at minimum, a hint/character-count on
the ops form referencing the existing guideline; a dedicated internal-notes field
is a schema change and would need the data repo, so it's a bigger, separate ask.
