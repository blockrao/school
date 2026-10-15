export type OpenEnquiry = {
  schoolName: string;
  parentName: string;
  email: string | null;
  phone: string | null;
  classLabel: string | null;
  message: string;
  origin: string;
};

/** Strip line breaks and control characters from one-line fields (header injection, spoofed layout). */
export function oneLine(value: string, max = 120): string {
  let out = "";
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    out += code < 32 || code === 127 ? " " : ch;
  }
  return out.replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * Email to the school: the parent's question and, because the parent ticked
 * consent on the form, their contact details. Plain text only; the message is
 * included as typed.
 */
export function buildOpenEnquiryEmail(e: OpenEnquiry): { subject: string; text: string } {
  const name = oneLine(e.parentName);
  return {
    subject: `A parent has a question for ${oneLine(e.schoolName, 80)} (via SchoolOye)`,
    text: [
      `Hello,`,
      ``,
      `A parent asked ${e.schoolName} a question through SchoolOye. They agreed to share their contact details with you so you can reply directly.`,
      ``,
      `Name: ${name}`,
      e.phone ? `Phone: ${e.phone}` : null,
      e.email ? `Email: ${e.email}` : null,
      e.classLabel ? `Class: ${e.classLabel}` : null,
      ``,
      `Question:`,
      e.message.trim(),
      ``,
      e.email
        ? `You can reply to this email to answer them.`
        : `Please call or message them to reply.`,
      ``,
      `Your school page: ${e.origin}`,
      `Claim your page to update fees, dates and facilities yourself: ${e.origin}/for-schools/claim`,
      ``,
      `SchoolOye`,
    ]
      .filter((l): l is string => l !== null)
      .join("\n"),
  };
}

/** Confirmation to the parent (only when they gave an email). */
export function buildParentConfirmationEmail(e: { schoolName: string; parentName: string }): {
  subject: string;
  text: string;
} {
  return {
    subject: `Your question to ${oneLine(e.schoolName, 80)} was sent`,
    text: [
      `Hi ${oneLine(e.parentName)},`,
      ``,
      `We passed your question to ${e.schoolName} along with the contact details you agreed to share. The school will reply to you directly.`,
      ``,
      `SchoolOye`,
    ].join("\n"),
  };
}
