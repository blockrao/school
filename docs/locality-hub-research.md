# Locality Hub Pages — Research & Decision

**Status:** In progress (launched Oct 2026)  
**Decision Timeline:** After 2-4 weeks of live traffic data

## Question

Should SchoolOye create individual hub pages for each locality (e.g., `/gurugram/sector-12`, `/delhi/east-delhi`)?

## Current Approach

**City hubs:** `/[state]/[city]` — primary entry point with:
- Browse by locality cards (link to `/[state]/[city]/[locality]` filter views)
- Featured/top-rated schools in city
- Active admissions across city
- Browse by board

**Locality pages:** Currently `/[state]/[city]/[locality]` shows filtered school listing

## Decision Criteria

### 1. **User Behavior Data** (highest priority)
Track in analytics:
- **Click-through rate:** % of city hub visitors who click a locality card
- **Filter usage:** % of city-page visitors who use locality filter vs. search
- **Direct traffic:** Do users search for "schools in [locality]" and arrive at locality URLs?
- **Bounce rate:** Locality filter pages vs. locality hub pages (if we build them)

**Threshold for "yes":**
- >30% of city hub visitors click locality cards, OR
- >20% of city listings are accessed via locality filter, OR
- >15% of organic traffic searches for specific locality names

### 2. **SEO Opportunity**
- Locality names: ~100-200 per city × 10-20 cities = 1,000-4,000 locality pages
- Search volume: "schools in [locality]" — estimate <50 searches/month per locality (low)
- Competitor moves: Check if Practo, BrainCue, Vedantu run locality hubs (if no, signals low demand)
- **Verdict:** Low SEO value unless specific localities are search hotspots (e.g., "schools in Indiranagar" for Bangalore tech crowd)

### 3. **Content Maintenance Cost**
- **Per page:** City overview, 3-4 highlight blocks, featured schools = ~2h template + 30min enrichment
- **At scale:** 2,000 locality pages = 67 full-time weeks if doing manually
- **With AI:** ~10h to auto-generate 2,000 pages + 2h per locality for manual review = feasible but ongoing

**Verdict:** Automation-dependent. Not viable for manual maintenance.

### 4. **User Value**
- **Hyperlocal discovery:** "Schools walking distance from me" — valuable IF map + distance sorting
- **Neighborhood exploration:** "This area is gentrifying, what schools are here?" — niche use case
- **Comparison:** "Compare schools across [locality]" — useful but same as city-level view with filter

**Verdict:** Marginal value over city-level filters.

---

## Recommendation (Preliminary)

**Start with:** City hubs only. Track user behavior in locality card clicks.

**If data shows >30% click rate on locality cards:** Investigate further.  
- Run A/B test: hub with locality cards vs. hub without
- Measure if explicit locality pages (vs. in-page filters) improve engagement

**If click rate <10%:** Skip locality hubs. Maintain filters on city pages.

---

## Tracking Setup

### Analytics Events to Log

In `/[locale]/[state]/[city]` hub page:

```typescript
// When user clicks a locality card
analytics.track('city_hub_locality_click', {
  city_slug: city.citySlug,
  locality_slug: locality.slug,
  locality_name: locality.name,
  school_count_in_locality: locality.schoolCount,
});

// When user clicks "See all schools" CTA
analytics.track('city_hub_view_all_click', {
  city_slug: city.citySlug,
});

// When user clicks featured school card
analytics.track('city_hub_featured_click', {
  city_slug: city.citySlug,
  school_id: school.id,
  board: board.name,
});
```

### Dashboard to Monitor

1. **Locality card click rate:** (sum of locality clicks) / (city hub pageviews)
2. **Locality filter usage:** (filtered school list views via locality) / (total school list pageviews)
3. **Search data:** Query strings containing locality names in Google Search Console
4. **Bounce rate comparison:** Locality filter pages vs. unfiltered city pages

---

## Timeline

- **Week 1 (Oct 2026):** City hubs live, tracking enabled
- **Week 4:** Review 3 weeks of data
- **Week 5-6:** Decision + A/B test if needed
- **Week 8:** Final call on locality hub investment

---

## Related Decisions

- [x] City hub pages: Approved, shipping Oct 19
- [ ] Locality hubs: Decision pending data (Oct-Nov)
- [ ] Board hubs: Separate decision (currently planned as `/city/board-schools`)
- [ ] Grade-level hubs: Future (e.g., `/city/primary-schools`)

---

## Notes

- Locality boundaries can shift (SARAS redefines districts, EduDel adjusts zones)
- Denormalized `active_admission_count` makes locality aggregation cheap (Week 1 optimization)
- If proceeding with locality hubs, prioritize high-traffic localities first (Gurugram sectors, Delhi zones)
