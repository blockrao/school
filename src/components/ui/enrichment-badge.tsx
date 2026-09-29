"use client";

// Helper function since date-fns may not be installed
function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  return "just now";
}

interface EnrichmentBadgeProps {
  enrichedAt?: string | null;
  enrichmentSources?: string[] | null;
  dataQualityFlags?: Record<string, number | null> | null;
  className?: string;
}

/**
 * Displays enrichment metadata: when data was enriched, which sources,
 * and per-field quality scores. Shown on entity pages as transparency
 * about data freshness and provenance.
 */
export function EnrichmentBadge({
  enrichedAt,
  enrichmentSources,
  dataQualityFlags,
  className = "",
}: EnrichmentBadgeProps) {
  if (!enrichedAt && (!enrichmentSources || enrichmentSources.length === 0)) {
    return null;
  }

  const enrichedDate = enrichedAt ? new Date(enrichedAt) : null;
  const sourceNames = enrichmentSources?.join(", ") || "External data";

  return (
    <div className={`inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700 ${className}`}>
      <svg
        className="h-3 w-3"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0z"
          clipRule="evenodd"
        />
      </svg>
      <span className="font-medium">{sourceNames}</span>
      {enrichedDate && (
        <span className="ml-1 text-blue-600">
          {formatDistanceToNow(enrichedDate)}
        </span>
      )}
    </div>
  );
}

interface EnrichmentMetadataProps {
  enrichedAt?: string | null;
  enrichmentSources?: string[] | null;
  dataQualityFlags?: Record<string, number | null> | null;
}

/**
 * Full enrichment metadata section for display at the bottom of entity pages.
 * Shows when data was enriched, sources, and quality scores per field.
 */
export function EnrichmentMetadataSection({
  enrichedAt,
  enrichmentSources,
  dataQualityFlags,
}: EnrichmentMetadataProps) {
  if (!enrichedAt && (!enrichmentSources || enrichmentSources.length === 0)) {
    return null;
  }

  const enrichedDate = enrichedAt ? new Date(enrichedAt) : null;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-blue-900">Data Enrichment</h3>

      <dl className="space-y-2 text-sm">
        {enrichedDate && (
          <div className="flex justify-between">
            <dt className="text-blue-700">Last changed</dt>
            <dd className="font-medium text-blue-900">
              {enrichedDate.toLocaleDateString("en-IN")}
              {" "}
              ({formatDistanceToNow(enrichedDate)})
            </dd>
          </div>
        )}

        {enrichmentSources && enrichmentSources.length > 0 && (
          <div className="flex justify-between">
            <dt className="text-blue-700">Sources</dt>
            <dd className="font-medium text-blue-900">{enrichmentSources.join(", ")}</dd>
          </div>
        )}

        {dataQualityFlags && Object.keys(dataQualityFlags).length > 0 && (
          <div>
            <dt className="mb-2 text-blue-700">Data quality</dt>
            <dd className="space-y-1">
              {Object.entries(dataQualityFlags).map(([field, score]) => {
                if (score === null || score === undefined || typeof score !== "number") return null;
                const percent = Math.round((score as number) * 100);
                const confidence = percent >= 90 ? "High" : percent >= 75 ? "Medium" : "Low";
                const colorClass =
                  percent >= 90 ? "bg-green-100 text-green-700" :
                  percent >= 75 ? "bg-yellow-100 text-yellow-700" :
                  "bg-orange-100 text-orange-700";

                return (
                  <div key={field} className="flex items-center justify-between text-xs">
                    <span className="text-blue-700 capitalize">{field.replace(/_/g, " ")}</span>
                    <span className={`rounded px-2 py-0.5 font-medium ${colorClass}`}>
                      {confidence} ({percent}%)
                    </span>
                  </div>
                );
              })}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
