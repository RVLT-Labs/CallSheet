import { Resend } from "resend";

const globalForResend = globalThis as unknown as {
  resend: Resend | undefined;
};

// Resend's constructor throws on an empty string, which would otherwise break
// `next build`/local dev before RESEND_API_KEY is configured. Sends still fail
// at request time with an auth error until a real key is set — that's expected.
export const resend =
  globalForResend.resend ??
  new Resend(process.env.RESEND_API_KEY || "re_dev_placeholder");

if (process.env.NODE_ENV !== "production") {
  globalForResend.resend = resend;
}

export const EMAIL_FROM = process.env.EMAIL_FROM ?? "Callsheet <noreply@rvlt.app>";

// Plain-text/minimal HTML sends for the auth flows (issue #1 scope).
export async function sendPlainEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  return resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}

// Templated shoot-invite/change-notification/reminder sends (issue #10) — table-based
// layout with inlined styles, optionally carrying the per-person .ics attachment.
export async function sendTemplatedEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachment?: { filename: string; content: string; contentType: string };
}) {
  return resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    attachments: params.attachment ? [params.attachment] : undefined,
  });
}
