import type { Metadata } from "next";

// Fully static content (no per-user or per-request data) — the layout no
// longer forces this dynamic (see [locale]/layout.tsx), so it can be a real
// ISR page instead of rendering fresh on every request.
export const revalidate = 3600;

// design-pending — no Guides screen exists in design/. See docs/design-gaps.md.
const TOPICS = [
  {
    title: "The admission process, step by step",
    blurb: "What happens between opening a form and getting a confirmed seat.",
  },
  {
    title: "Documents you'll need",
    blurb: "Birth certificate, address proof, category certificates — what each school asks for.",
  },
  {
    title: "Choosing a board",
    blurb: "CBSE, ICSE and state boards compared for what actually differs day to day.",
  },
];

export function generateMetadata(): Metadata {
  return {
    title: "Guides — SchoolOye",
    description: "Admission process, required documents, and board comparisons for parents.",
    alternates: {
      canonical: "/guides",
      languages: { "en-IN": "/en/guides", "hi-IN": "/hi/guides" },
    },
  };
}

export default function GuidesPage() {
  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d">Guides</h1>
      <p className="mt-2 text-body text-muted-ink">
        Admission process, documents, and how boards differ — written for parents, not schools.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {TOPICS.map((topic) => (
          <div key={topic.title} className="rounded-md border border-rule p-4">
            <span className="font-display text-card font-semibold">{topic.title}</span>
            <p className="mt-1 text-body text-muted-ink">{topic.blurb}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
