import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApplicationStatusRow } from "@/components/ui/application-status-row";
import { SeatPill, SessionTag, SponsoredTag, StatusPill } from "@/components/ui/badges";
import { Button, TextLink } from "@/components/ui/button";
import { CompareTable } from "@/components/ui/compare-table";
import { CompareTray } from "@/components/ui/compare-tray";
import { ConsentCheckbox } from "@/components/ui/consent-checkbox";
import { DeadlineMargin } from "@/components/ui/deadline-margin";
import { DocumentChecklistItem } from "@/components/ui/document-checklist-item";
import { FeatureCard } from "@/components/ui/feature-card";
import { FilterChip, RemovableFilterChip } from "@/components/ui/filter-chip";
import { FreshnessLine, NotYetPublished } from "@/components/ui/freshness-line";
import { MapPin } from "@/components/ui/map-pin";
import { CountToggleGroup, ResultTabs, ViewToggle } from "@/components/ui/nav-links";
import { OtpInput } from "@/components/ui/otp-input";
import { RecommendationQuote } from "@/components/ui/recommendation-quote";
import { SchoolCard } from "@/components/ui/school-card";
import { SearchBar } from "@/components/ui/search-bar";
import { ShareSheet } from "@/components/ui/share-sheet";
import { EmptyState, ErrorState } from "@/components/ui/state-message";
import { TeacherCard, UnclaimedProfileCard } from "@/components/ui/teacher-card";
import { VerificationChip } from "@/components/ui/verification-chip";

export const metadata: Metadata = {
  title: "Component gallery",
  robots: { index: false, follow: false },
};

// Fixed reference instant so every DeadlineMargin/FreshnessLine state below is
// deterministic across renders instead of drifting with the real clock.
const NOW = new Date("2027-01-15T04:00:00.000Z"); // 2027-01-15 09:30 IST
const DAY = 86_400_000;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-rule-soft pb-8">
      <h2 className="font-display text-section font-semibold">{title}</h2>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  );
}

export default function ComponentsGalleryPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="mx-auto flex max-w-page flex-col gap-8 p-8">
      <div>
        <h1 className="font-display text-title-d font-semibold">Component gallery</h1>
        <p className="text-body text-muted-ink">
          Dev-only. Every component in src/components/ui in every state. Not indexed, 404s in
          production.
        </p>
      </div>

      <Section title="Buttons">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button asChild variant="secondary">
          <a href="/school/1-green-valley">As link</a>
        </Button>
        <TextLink href="/school/1-green-valley">Text link</TextLink>
      </Section>

      <Section title="Status pills">
        <StatusPill status="not-announced">Not announced</StatusPill>
        <StatusPill status="upcoming">Upcoming</StatusPill>
        <StatusPill status="open">Open</StatusPill>
        <StatusPill status="closing-soon">Closing soon</StatusPill>
        <StatusPill status="closed">Closed</StatusPill>
        <StatusPill status="results-out">Results out</StatusPill>
      </Section>

      <Section title="Seat pills, session tag, sponsored tag">
        <SeatPill status="available">Seats available · 4</SeatPill>
        <SeatPill status="few">Few seats · 2</SeatPill>
        <SeatPill status="waitlist">Waitlist</SeatPill>
        <SeatPill status="full">Full</SeatPill>
        <SessionTag>This session · 2026–27</SessionTag>
        <SessionTag>Next session · 2027–28</SessionTag>
        <SponsoredTag />
      </Section>

      <Section title="Verification chips">
        <VerificationChip variant="verified">Verified by school</VerificationChip>
        <VerificationChip variant="not-verified">Not yet verified</VerificationChip>
        <VerificationChip variant="claimed">Profile claimed by teacher</VerificationChip>
        <VerificationChip variant="not-claimed">Not claimed</VerificationChip>
      </Section>

      <Section title="Deadline margin — all 8 states (fixed now = 2027-01-15 09:30 IST)">
        <DeadlineMargin now={NOW} closesAt={new Date(NOW.getTime() + 4 * DAY)} />
        <DeadlineMargin now={NOW} closesAt={NOW} />
        <DeadlineMargin now={NOW} closesAt={new Date(NOW.getTime() + 15 * DAY)} />
        <DeadlineMargin now={NOW} opensAt={new Date(NOW.getTime() + 30 * DAY)} />
        <DeadlineMargin now={NOW} />
        <DeadlineMargin now={NOW} closesAt={new Date(NOW.getTime() - 3 * DAY)} />
        <DeadlineMargin now={NOW} seatsNow={{ count: 2, grade: "Cl. 4" }} />
        <DeadlineMargin now={NOW} opensAt={new Date(NOW.getTime() - 10 * DAY)} />
      </Section>

      <Section title="Freshness line — verified vs retrieved-only, fresh vs stale">
        <FreshnessLine
          now={NOW}
          retrievedAt={new Date(NOW.getTime() - 5 * DAY)}
          verifiedAt={new Date(NOW.getTime() - 2 * DAY)}
          source="school notice"
        />
        <FreshnessLine
          now={NOW}
          retrievedAt={new Date(NOW.getTime() - 12 * DAY)}
          verifiedAt={new Date(NOW.getTime() - 9 * DAY)}
          source="school notice"
        />
        <FreshnessLine
          now={NOW}
          retrievedAt={new Date(NOW.getTime() - 2 * DAY)}
          source="school WhatsApp reply"
        />
        <FreshnessLine
          now={NOW}
          retrievedAt={new Date(NOW.getTime() - 9 * DAY)}
          source="school notice"
        />
        <NotYetPublished />
      </Section>

      <Section title="School card — default / sponsored / stale / unknown">
        <SchoolCard
          name="Green Valley Public School"
          meta="CBSE · Nursery–12 · Malviya Nagar · 1.2 km"
          now={NOW}
          deadline={{ closesAt: new Date(NOW.getTime() + 4 * DAY) }}
          status={<StatusPill status="closing-soon">Closing soon</StatusPill>}
          fee="Registration ₹1,000"
          freshness={
            <FreshnessLine
              now={NOW}
              retrievedAt={new Date(NOW.getTime() - 4 * DAY)}
              verifiedAt={new Date(NOW.getTime() - 2 * DAY)}
              source="school notice"
            />
          }
        />
        <SchoolCard
          name="Aravali International School"
          meta="CBSE · Nursery–12 · Malviya Nagar · 1.2 km"
          sponsored
          now={NOW}
          deadline={{ closesAt: new Date(NOW.getTime() + 30 * DAY) }}
          status={<StatusPill status="open">Open</StatusPill>}
          fee="Registration ₹1,500"
          freshness={
            <FreshnessLine
              now={NOW}
              retrievedAt={new Date(NOW.getTime() - 3 * DAY)}
              verifiedAt={new Date(NOW.getTime() - 1 * DAY)}
              source="school notice"
            />
          }
        />
        <SchoolCard
          name="Green Valley Public School"
          meta="CBSE · Nursery–12 · Malviya Nagar · 1.2 km"
          now={NOW}
          deadline={{ closesAt: new Date(NOW.getTime() + 15 * DAY) }}
          status={<StatusPill status="open">Open</StatusPill>}
          fee="Registration ₹750"
          freshness={
            <FreshnessLine
              now={NOW}
              retrievedAt={new Date(NOW.getTime() - 12 * DAY)}
              verifiedAt={new Date(NOW.getTime() - 9 * DAY)}
              source="school notice"
            />
          }
        />
        <SchoolCard
          name="Green Valley Public School"
          meta="CBSE · Nursery–12 · Malviya Nagar · 1.2 km"
          now={NOW}
          deadline={{}}
          status={<StatusPill status="not-announced">Not announced</StatusPill>}
          fee={<NotYetPublished />}
          freshness={
            <FreshnessLine
              now={NOW}
              retrievedAt={new Date(NOW.getTime() - 4 * DAY)}
              source="school website"
            />
          }
        />
      </Section>

      <Section title="Search bar — normal / error">
        <SearchBar
          id="search-normal"
          classOptions={["Nursery", "LKG", "UKG"]}
          boardOptions={["CBSE", "ICSE"]}
        />
        <SearchBar
          id="search-error"
          classOptions={["Nursery", "LKG", "UKG"]}
          boardOptions={["CBSE", "ICSE"]}
          error="Enter a school name or area to search."
        />
      </Section>

      <Section title="Filter chips">
        <FilterChip href="/search?class=nursery" selected>
          Class: Nursery ▾
        </FilterChip>
        <FilterChip href="/search?board=open">Board ▾</FilterChip>
        <RemovableFilterChip href="/search?radius=">Within 5 km</RemovableFilterChip>
      </Section>

      <Section title="View toggle, count toggle group, result tabs">
        <ViewToggle
          items={[
            { label: "List", href: "/search?view=list", active: true },
            { label: "Map", href: "/search?view=map" },
          ]}
        />
        <CountToggleGroup
          items={[
            { label: "Open now 8", href: "/search?f=open", active: true },
            { label: "Closing soon 3", href: "/search?f=closing" },
            { label: "Upcoming 3", href: "/search?f=upcoming" },
          ]}
        />
        <ResultTabs
          items={[
            { label: "Overview", href: "/school/1-green-valley" },
            { label: "Admissions", href: "/school/1-green-valley/admissions", active: true },
            { label: "Fees", href: "/school/1-green-valley/fees" },
            { label: "Facilities", href: "/school/1-green-valley/facilities" },
            { label: "Teachers", href: "/school/1-green-valley/teachers" },
          ]}
        />
      </Section>

      <Section title="Map pins">
        <MapPin variant="closing-soon">Closes in 4 days</MapPin>
        <MapPin variant="open">Open</MapPin>
        <MapPin variant="upcoming">Opens 1 Nov</MapPin>
        <MapPin variant="not-announced">Not announced</MapPin>
      </Section>

      <Section title="Compare tray and table">
        <CompareTray
          selectedCount={3}
          totalCount={4}
          clearHref="/compare?clear=1"
          compareHref="/compare"
        />
        <CompareTable
          rows={[
            { label: "Registration fee", values: ["₹1,000", <NotYetPublished key="fee" />] },
            { label: "Admission", values: ["Closing soon · 4 days", "Open · 15 days left"] },
          ]}
        />
      </Section>

      <Section title="Share sheet">
        <ShareSheet
          schoolName="Green Valley Public School"
          shareUrl="https://schooloye.example/school/1-green-valley"
        />
      </Section>

      <Section title="Document checklist item">
        <DocumentChecklistItem
          variant="ready"
          title="Birth certificate"
          status="Ready · checked by us"
          actionLabel="Replace"
          actionHref="/my/documents"
        />
        <DocumentChecklistItem
          variant="missing"
          title="Parent's ID proof"
          status="Missing · needed by all schools"
          actionLabel="Upload"
          actionHref="/my/documents"
        />
      </Section>

      <Section title="Application status row — all 4 tones">
        <ApplicationStatusRow
          tone="preparing"
          schoolName="Green Valley Public School"
          statusLabel="Preparing"
          description="We're getting your form ready."
        />
        <ApplicationStatusRow
          tone="waiting-approval"
          schoolName="Green Valley Public School"
          statusLabel="Waiting for your approval"
          description="Form is ready. Check before we submit."
          actionLabel="Review and approve"
          actionHref="/my/applications/1"
        />
        <ApplicationStatusRow
          tone="submitted"
          schoolName="Green Valley Public School"
          statusLabel="Submitted · APP-10293"
          description="We'll notify you the moment the school responds."
        />
        <ApplicationStatusRow
          tone="interview"
          schoolName="Green Valley Public School"
          statusLabel="Interview on 4 Feb"
          description="Bring original documents and the acknowledgement slip."
        />
      </Section>

      <Section title="OTP input — normal / error">
        <OtpInput />
        <OtpInput error="That code didn't match. Check the SMS and try again." />
      </Section>

      <Section title="Consent checkbox — normal / error">
        <ConsentCheckbox name="consent-demo-1">
          I agree to get admission alerts from SchoolOye on WhatsApp at +91 98290 41736.
        </ConsentCheckbox>
        <ConsentCheckbox name="consent-demo-2" error="You need to agree before we can continue.">
          I agree to get admission alerts from SchoolOye on WhatsApp at +91 98290 41736.
        </ConsentCheckbox>
      </Section>

      <Section title="Empty and error states">
        <EmptyState
          title="No open schools match these filters"
          description="Always offer a next step: widen, remove a filter, or get an alert."
          nextStepLabel="Widen to 5 km · 2 schools"
          nextStepHref="/search?radius=5"
        />
        <ErrorState
          title="We couldn't load schools"
          description="Your connection dropped. Saved schools still work offline."
        />
      </Section>

      <Section title="Teacher cards">
        <TeacherCard
          name="Meenakshi Rathore"
          subject="Mathematics · TGT"
          schoolName="Nav Bharti Academy"
          tag="Teacher of the Week · Oct 2026"
        />
        <UnclaimedProfileCard
          name="R. Sharma"
          subject="Science"
          claimHref="/teacher/claim?name=r-sharma"
        />
      </Section>

      <Section title="Recommendation quote">
        <RecommendationQuote
          quote="She explains every step and never makes children feel slow."
          name="Priya K."
          relationship="Parent of a Class 8 student"
        />
      </Section>

      <Section title="Feature card">
        <FeatureCard
          eyebrow="Teacher of the week"
          meta="Jaipur · 12 Oct"
          name="Meenakshi Rathore"
          subtitle="Mathematics · Nav Bharti Academy"
          blurb="Runs a Saturday maths club where students map their mohalla."
          primaryHref="/teacher/1-meenakshi-rathore"
          primaryLabel="Read their story"
          secondaryHref="/teacher/nominate"
          secondaryLabel="Nominate a teacher"
        />
      </Section>
    </main>
  );
}
