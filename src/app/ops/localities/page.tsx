import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/state-message";
import { requireStaff } from "@/lib/db/ops";
import { getPublicDistrictBySlug, listPublicLocalitiesByCity } from "@/lib/db/public-adapter";
import { assignLocality } from "./actions";

const DISTRICT_SLUG = "jaipur";

export const metadata: Metadata = {
  title: "Locality assignments — SchoolOye ops",
  robots: { index: false, follow: false },
};

export default async function OpsLocalitiesPage() {
  const supabase = await requireStaff();

  const district = await getPublicDistrictBySlug(DISTRICT_SLUG);
  const [{ data: schools }, localities] = await Promise.all([
    district
      ? supabase
          .from("schools")
          .select("id, name_en, address, pincode")
          .eq("district_id", district.id)
          .is("locality_id", null)
          .order("name_en", { ascending: true })
      : Promise.resolve({
          data: [] as {
            id: string;
            name_en: string | null;
            address: string | null;
            pincode: string | null;
          }[],
        }),
    listPublicLocalitiesByCity(DISTRICT_SLUG, 0),
  ]);

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">Locality assignments</h1>
      <p className="mt-1 text-body text-muted-ink">
        Schools with no locality assigned — routing and locality pages need this to place them.
      </p>

      {!schools || schools.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing pending"
            description="Every school in Jaipur has a locality assigned."
            nextStepLabel="Back to ops"
            nextStepHref="/ops"
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {schools.map((school) => (
            <form
              key={school.id}
              action={assignLocality}
              className="flex flex-wrap items-end gap-3 rounded-md border border-rule bg-copy-white p-4"
            >
              <input type="hidden" name="schoolId" value={school.id} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-display text-card font-semibold">
                  {school.name_en ?? "Name not yet published"}
                </span>
                <span className="text-meta text-muted-ink">
                  {school.address ?? "No address on file"}
                  {school.pincode ? ` · ${school.pincode}` : ""}
                </span>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-meta font-semibold text-muted-ink">Locality</span>
                <select
                  name="localityId"
                  required
                  className="h-10 w-56 rounded-md border border-line-blue-strong bg-copy-white px-2 text-meta outline-none"
                >
                  <option value="">Select</option>
                  {localities.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-meta font-semibold text-muted-ink">Note (optional)</span>
                <input
                  type="text"
                  name="note"
                  placeholder="e.g. matched by pincode"
                  className="h-10 w-56 rounded-md border border-line-blue-strong bg-copy-white px-2 text-meta outline-none"
                />
              </label>
              <button
                type="submit"
                className="flex h-10 items-center rounded-md bg-ruled-blue px-3 text-meta font-semibold text-copy-white"
              >
                Assign
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
