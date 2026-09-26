import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/state-message";
import { requireStaff } from "@/lib/db/ops";
import { listStaff } from "@/lib/db/ops-dashboard";
import { grantStaffRole, revokeStaffRole } from "./actions";

export const metadata: Metadata = {
  title: "Staff — SchoolOye ops",
  robots: { index: false, follow: false },
};

const ERROR_COPY: Record<string, string> = {
  missing_email: "Enter an email address.",
  not_found: "No account found for that email — they need to sign in at least once first.",
  self_revoke: "You can't remove your own staff access — ask another admin.",
};

type SearchParams = { error?: string; email?: string };

export default async function OpsStaffPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { error } = await searchParams;
  const supabase = await requireStaff();

  // listStaff() is independent of the admin-role check below — run them
  // concurrently instead of stacking two round trips.
  const meQuery = (async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user?.id ?? "")
      .single();
    return { userId: user?.id, isAdmin: me?.role === "admin" };
  })();

  const [{ userId, isAdmin }, staff] = await Promise.all([meQuery, listStaff()]);

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">Staff</h1>
      <p className="mt-1 text-body text-muted-ink">
        Everyone with platform-wide ops or admin access.
        {!isAdmin ? " Only admins can change roles — you have read-only ops access here." : ""}
      </p>

      {error ? (
        <p className="mt-4 rounded-md border border-pill-closed-bd bg-pill-closed-bg px-3 py-2 text-meta">
          {ERROR_COPY[error] ?? "Something went wrong."}
        </p>
      ) : null}

      {isAdmin ? (
        <form
          action={grantStaffRole}
          className="mt-6 flex flex-wrap items-end gap-3 rounded-md border border-rule bg-copy-white p-4"
        >
          <label className="flex flex-col gap-1 text-meta">
            Grant access by email
            <input
              name="email"
              type="email"
              required
              placeholder="name@example.com"
              className="h-10 w-64 rounded-md border border-rule px-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-meta">
            Role
            <select
              name="role"
              defaultValue="ops"
              className="h-10 rounded-md border border-rule px-2"
            >
              <option value="ops">Ops</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button
            type="submit"
            className="flex h-10 items-center rounded-md bg-ruled-blue px-4 text-meta font-semibold text-copy-white"
          >
            Grant
          </button>
          <p className="w-full text-meta text-muted-ink">
            The person must already have an account (signed in once) — this promotes an existing
            profile, it doesn't create one.
          </p>
        </form>
      ) : null}

      {staff.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No staff"
            description="No one has ops or admin access yet."
            nextStepLabel="Back to ops"
            nextStepHref="/ops"
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {staff.map((s) => (
            <div
              key={s.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-copy-white p-3"
            >
              <div>
                <span className="font-semibold">{s.fullName ?? s.email ?? s.userId}</span>
                {s.email ? <span className="ml-2 text-meta text-muted-ink">{s.email}</span> : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-rule px-2 py-0.5 text-meta capitalize">
                  {s.role}
                </span>
                {isAdmin && s.userId !== userId ? (
                  <form action={revokeStaffRole}>
                    <input type="hidden" name="userId" value={s.userId} />
                    <button
                      type="submit"
                      className="rounded-md border border-ink px-3 py-1.5 text-meta font-semibold"
                    >
                      Revoke
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
