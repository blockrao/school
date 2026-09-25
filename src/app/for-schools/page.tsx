import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For schools — SchoolOye",
  description: "Claim your school's page for free and keep parents up to date.",
  alternates: { canonical: "/for-schools" },
};

const HOW = [
  { t: "Find your school", d: "Search for your school on SchoolOye." },
  {
    t: "Verify you work there",
    d: "Confirm using your official email or phone on record, or upload a letter on school letterhead.",
  },
  { t: "We review", d: "Usually the same working day. You'll see your status on the claim page." },
  {
    t: "Manage your page",
    d: "Post admission notices, keep seat status current, and request profile edits.",
  },
];

export default function ForSchoolsPage() {
  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d">Claim your school, free</h1>
      <p className="mt-2 text-body text-muted-ink">
        Keep your school's page accurate and current for the parents already searching for it.
        Claiming never changes where your school appears in search.
      </p>

      <div className="mt-6 flex flex-col">
        {HOW.map((h, i) => (
          <div key={h.t} className="flex gap-3.5 border-t border-rule-soft py-3 first:border-t-0">
            <span className="w-8 shrink-0 border-r-2 border-ink font-display text-section font-bold">
              {i + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">{h.t}</span>
              <span className="text-meta text-muted-ink">{h.d}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2 rounded-md border border-rule bg-copy-white p-4">
        <span className="font-semibold">Good to know</span>
        <span className="text-body">
          We only accept verification through contact details already on public record for your
          school, so nobody can claim it with a personal number.
        </span>
        <span className="text-body font-semibold">
          Claiming is free. Featured placement is a separate, clearly-labelled paid option — never
          required.
        </span>
      </div>

      <Link
        href="/for-schools/claim"
        className="mt-8 inline-flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
      >
        Claim your school
      </Link>
    </div>
  );
}
