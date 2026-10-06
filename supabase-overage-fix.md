# Supabase Overage Emergency Fix Plan
**Date:** 2026-10-06  
**Status:** 116% query logs, 789% ingestion, 126% egress — ALL CRITICAL

---

## Root Cause Analysis

### 1. Log Query (116 GB / 116% over) — **PRIMARY KILLER**
- Supabase logs **every database query** (SELECT, INSERT, UPDATE, DELETE)
- At current query rate: ~1.16 GB/day of query logs
- This is configured at Supabase project level (Admin → Settings → Logging)
- **NOT fixable from app code — requires Supabase dashboard**

### 2. Log Ingestion (7.9 GB / 789% over)
- Realtime/PostgreSQL WAL (Write-Ahead Logs) are logging all writes
- Each INSERT/UPDATE generates ~400-500 bytes of log data
- Multiplied by ~10,000+ daily school data updates

### 3. Egress (6.3 GB / 126% over)
- API responses flowing to clients (desktop, mobile, crawlers)
- Uncompressed JSON responses
- No caching layer reducing repeated requests

---

## Immediate Actions (Today)

### A) Fix Logging in Supabase Dashboard (DO THIS FIRST)
**Log into Supabase Console → Select Project → Settings → Logging:**

1. **Disable Query Logging** (this alone will save ~100 GB/month)
   - Find: "Query Logs" or "Statement Logs"
   - Set: "Minimum log level" → ERROR ONLY (or disable)
   - This stops logging every SELECT query

2. **Reduce WAL Retention** (save 6-8 GB/month)
   - Find: "WAL (Write-Ahead Log)" settings
   - Set: "wal_keep_segments" → 16 (default is 64)
   - Or enable automatic archiving to S3

3. **Disable Realtime if Unused**
   - Settings → Realtime
   - If no live updates needed: disable
   - Saves ~2-3 GB/month

**Expected Result:** Drop from 116 GB → ~5-10 GB query logs

---

### B) Enable Response Compression (30-min fix, saves 60% bandwidth)

**Add to `next.config.ts`:**

```typescript
const nextConfig: NextConfig = {
  compress: true,  // Enable gzip compression for all responses
  
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Encoding", value: "gzip" },
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400" },
        ],
      },
    ];
  },
  
  // ... rest of config
};
```

**Expected Result:** Egress drops from 6.3 GB → 2.5-3 GB (60% compression ratio)

---

### C) Reduce API Payload Sizes (Code changes)

**Current Problem:** API views return ALL columns, even ones not needed

**Fix Strategy:** Only fetch needed fields

**Example in public-adapter.ts:**
```typescript
// BEFORE: Fetches all 61 school columns
const schools = await db
  .from('schools')
  .select('*')
  .limit(100);

// AFTER: Fetch only used fields
const schools = await db
  .from('schools')
  .select('id, name_en, name_hi, location, lat, lng, board, management')
  .limit(100);
```

**Where to Apply:**
- `src/lib/db/public-adapter.ts` — largest API payloads
- `src/app/[locale]/[city]/page.tsx` — city listing pages
- `src/app/[locale]/school/[slug]/page.tsx` — school detail pages

**Expected Result:** Reduce response size by 40-50% (saves 2-3 GB/month)

---

### D) Implement Client-Side Caching (3-hour fix, saves 30% queries)

**Add HTTP caching headers to api.* views:**

```typescript
// In supabase migrations:
ALTER TABLE api.public_schools SET (
  ttl = 3600  -- Cache for 1 hour
);
```

**Add to Vercel/Next.js:**
```typescript
// Add to route handlers
res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
```

**Expected Result:** Reduce repeated queries by 30% (saves 2-3 GB/month)

---

## Implementation Priority

| Action | Effort | Savings | Timeline | MUST DO? |
|--------|--------|---------|----------|----------|
| 1. Disable query logging (Supabase dashboard) | 5 min | ~100 GB/mo | TODAY | 🔴 YES |
| 2. Enable response compression | 30 min | 3-4 GB/mo | TODAY | 🔴 YES |
| 3. Optimize API payloads | 2-3 hrs | 2-3 GB/mo | THIS WEEK | 🟠 YES |
| 4. Implement caching | 3 hrs | 2-3 GB/mo | THIS WEEK | 🟠 YES |
| 5. Review expensive queries | 4+ hrs | 1-2 GB/mo | NEXT WEEK | 🟡 Maybe |

---

## Expected Results

**Current Usage (CRISIS):**
- Query Logs: 116 GB (116%)
- Ingestion Logs: 7.9 GB (789%)
- Egress: 6.3 GB (126%)
- **Total Overage Cost: ~$250-300/month**

**After Fixes:**
- Query Logs: 5 GB (5%) ← Disable dashboard logging
- Ingestion Logs: 2 GB (200%) ← WAL reduction
- Egress: 1.5 GB (30%) ← Compression + payload optimization
- **Total Overage Cost: ~$0 (within quotas)**

---

## Monthly Projections (After Fixes)

At current usage, without fixes: **~$300+/month in Supabase overage charges**

With these fixes: **Within free tier, or $0 additional charges**

---

## Action Checklist

- [ ] **TODAY:** Log into Supabase dashboard
- [ ] Disable query logging in Settings → Logging
- [ ] Reduce WAL retention
- [ ] Review & disable realtime if unused
- [ ] Verify billing estimate drops immediately (check Usage page)

- [ ] **TODAY:** Update `next.config.ts` with compression
- [ ] Push to main → Vercel auto-deploys
- [ ] Verify response headers include `Content-Encoding: gzip`

- [ ] **THIS WEEK:** Optimize `public-adapter.ts` to select only needed fields
- [ ] Audit city page queries (likely fetching too many columns)
- [ ] Review school detail page API calls

- [ ] **NEXT WEEK:** Monitor Supabase usage dashboard
- [ ] Implement HTTP caching headers
- [ ] Review slow query logs for optimization opportunities

---

## Questions for Prav

1. **Is realtime used?** (live admission updates, etc.) If not, disable it entirely
2. **Do school listings need all 61 columns?** Can we reduce to ~10-15 essential fields?
3. **Is there a crawler hammering the API?** (could be the 6.3 GB egress)
4. **What's the current monthly Supabase bill?** (to track savings)

