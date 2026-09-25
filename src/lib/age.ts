export type AgeAtDate = { years: number; months: number };

/**
 * Calendar age (years + remaining months) as of `asOf`, given a date of birth.
 * Pure date-field arithmetic (no timezone conversion needed — a birth date and
 * "as of" date are both calendar dates, not instants).
 */
export function ageAtDate(dob: Date, asOf: Date): AgeAtDate {
  if (asOf < dob) return { years: 0, months: 0 };

  let years = asOf.getFullYear() - dob.getFullYear();
  let months = asOf.getMonth() - dob.getMonth();
  if (asOf.getDate() < dob.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months };
}

/**
 * The calendar year of the next Indian academic year (which starts 1 April) —
 * this year's if today is before 1 April, next year's otherwise. "Next
 * academic year" is what a parent checking eligibility actually wants, not a
 * cut-off that may already be in the past.
 */
export function nextAcademicYear(today: Date): number {
  const aprilThisYear = new Date(today.getFullYear(), 3, 1);
  return today < aprilThisYear ? today.getFullYear() : today.getFullYear() + 1;
}

/** The three age-cut-off reference dates different boards commonly publish, for one academic year. */
export function referenceDates(academicYear: number): { label: string; date: Date }[] {
  return [
    { label: "31 March", date: new Date(academicYear, 2, 31) },
    { label: "30 June", date: new Date(academicYear, 5, 30) },
    { label: "30 September", date: new Date(academicYear, 8, 30) },
  ];
}
