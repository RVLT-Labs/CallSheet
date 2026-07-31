// Table-based, inline-styled email HTML (design system §9) — real client
// compatibility matters more here than anywhere else in the app, so this
// deliberately doesn't reuse the Tailwind-driven component library. Font
// fallback: Playfair Display -> Georgia italic (display moments), Inter ->
// Arial/Helvetica (everything functional), per the design system's stack.

const DISPLAY_FONT = "'Playfair Display', Georgia, 'Times New Roman', serif";
const BODY_FONT = "'Inter', Arial, Helvetica, sans-serif";
const MONO_FONT = "'Space Mono', 'Courier New', Courier, monospace";

const COLOR = {
  cream: "#fbf6ef",
  ink: "#3a2e28",
  inkSoft: "#8a7b6e",
  inkFaint: "#b7a996",
  burgundy: "#6e1f2a",
  terracotta: "#b5773a",
  forest: "#35563e",
  hairline: "#e6dbca",
  white: "#ffffff",
};

function shell(bodyHtml: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR.cream};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:${COLOR.white};border-radius:8px;">
        <tr>
          <td style="padding:28px 32px 4px 32px;">
            <p style="margin:0;font-family:${DISPLAY_FONT};font-style:italic;font-weight:bold;font-size:20px;color:${COLOR.burgundy};">Callsheet</p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 32px 32px 32px;font-family:${BODY_FONT};font-size:14px;line-height:1.6;color:${COLOR.ink};">
            ${bodyHtml}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function button(label: string, url: string, variant: "primary" | "secondary") {
  const styles =
    variant === "primary"
      ? `background-color:${COLOR.burgundy};color:${COLOR.white};border:1.5px solid ${COLOR.burgundy};`
      : `background-color:${COLOR.white};color:${COLOR.inkSoft};border:1.5px solid ${COLOR.hairline};`;
  return `<a href="${url}" style="display:inline-block;padding:12px 22px;border-radius:6px;font-family:${BODY_FONT};font-size:13.5px;font-weight:bold;text-decoration:none;${styles}">${label}</a>`;
}

function dateLineHtml(dateLabel: string, halfDayLabel: string, timeLabel: string, time: string) {
  return `<p style="margin:0 0 4px 0;font-family:${BODY_FONT};font-size:13.5px;color:${COLOR.ink};">${dateLabel} · ${halfDayLabel} · ${timeLabel} ${time}</p>`;
}

// Shoots use "Call" (call time, film-crew jargon); meetings use "Start" — same
// date-line shape, different noun (dateLineHtml, the .ics attached-line copy,
// and the "View shoot"/"View meeting" button all key off this).
export type EventKind = "shoot" | "meeting";

const EVENT_NOUN: Record<EventKind, string> = { shoot: "shoot", meeting: "meeting" };
const TIME_LABEL: Record<EventKind, string> = { shoot: "Call", meeting: "Start" };
const TIME_NOUN: Record<EventKind, string> = { shoot: "call time", meeting: "start time" };

// Same deterministic name -> color hash as the Avatar component (design system
// §5.4), reimplemented table-based so it renders in clients without CSS gradients
// or border-radius on flex containers.
const AVATAR_PALETTE = [COLOR.burgundy, COLOR.terracotta, COLOR.forest, COLOR.ink];

function avatarColorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function avatarHtml(name: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td width="52" height="52" align="center" valign="middle" style="width:52px;height:52px;border-radius:26px;background-color:${avatarColorFor(name)};font-family:${BODY_FONT};font-size:18px;font-weight:bold;color:${COLOR.white};">${initialsFor(name)}</td></tr></table>`;
}

export type InviteEmailDay = { dateLabel: string; halfDayLabel: string; time: string };

export function renderInviteEmail(params: {
  kind: EventKind;
  recipientName: string;
  eventTitle: string;
  days: InviteEmailDay[];
  locationAddress: string | null;
  locationNotes: string | null;
  acceptUrl: string;
  declineUrl: string;
}) {
  const { kind, recipientName, eventTitle, days, locationAddress, locationNotes, acceptUrl, declineUrl } = params;
  const timeLabel = TIME_LABEL[kind];

  const daysHtml = days.map((d) => dateLineHtml(d.dateLabel, d.halfDayLabel, timeLabel, d.time)).join("");
  const locationHtml = locationAddress
    ? `<p style="margin:16px 0 0 0;font-family:${BODY_FONT};font-size:13.5px;color:${COLOR.inkSoft};">${locationAddress}</p>`
    : "";
  const notesHtml = locationNotes
    ? `<p style="margin:4px 0 0 0;font-family:${BODY_FONT};font-size:12.5px;font-style:italic;color:${COLOR.inkSoft};">${locationNotes}</p>`
    : "";

  const html = shell(`
    <p style="margin:0 0 16px 0;">Hi ${recipientName},</p>
    <p style="margin:0 0 16px 0;">You're invited to <strong>${eventTitle}</strong>.</p>
    ${daysHtml}
    ${locationHtml}
    ${notesHtml}
    <div style="margin-top:24px;">
      ${button("Accept", acceptUrl, "primary")}
      <span style="display:inline-block;width:10px;"></span>
      ${button("Decline", declineUrl, "secondary")}
    </div>
    <p style="margin:24px 0 0 0;font-size:12px;color:${COLOR.inkSoft};">A calendar invite for this ${EVENT_NOUN[kind]} is attached, set to your ${TIME_NOUN[kind]}.</p>
  `);

  const text = [
    `Hi ${recipientName},`,
    `You're invited to ${eventTitle}.`,
    ...days.map((d) => `${d.dateLabel} - ${d.halfDayLabel} - ${timeLabel} ${d.time}`),
    locationAddress ?? "",
    locationNotes ?? "",
    `Accept: ${acceptUrl}`,
    `Decline: ${declineUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: `You're invited: ${eventTitle}`, html, text };
}

export type ChangeField = { label: string; oldValue: string; newValue: string };

export function renderChangeNotificationEmail(params: {
  kind: EventKind;
  recipientName: string;
  eventTitle: string;
  changes: ChangeField[];
  viewUrl: string;
}) {
  const { kind, recipientName, eventTitle, changes, viewUrl } = params;

  const changesHtml = changes
    .map(
      (c) =>
        `<p style="margin:0 0 8px 0;font-family:${BODY_FONT};font-size:13.5px;">
          <span style="color:${COLOR.inkSoft};">${c.label}:</span>
          <span style="text-decoration:line-through;color:${COLOR.inkSoft};">${c.oldValue}</span>
          &rarr;
          <strong style="color:${COLOR.ink};">${c.newValue}</strong>
        </p>`,
    )
    .join("");

  const html = shell(`
    <p style="margin:0 0 16px 0;">Hi ${recipientName},</p>
    <p style="margin:0 0 16px 0;"><strong>${eventTitle}</strong> has changed.</p>
    ${changesHtml}
    <div style="margin-top:24px;">
      ${button(`View ${EVENT_NOUN[kind]}`, viewUrl, "primary")}
    </div>
    <p style="margin:24px 0 0 0;font-size:12px;color:${COLOR.inkSoft};">An updated calendar invite is attached, replacing the previous one.</p>
  `);

  const text = [
    `Hi ${recipientName},`,
    `${eventTitle} has changed.`,
    ...changes.map((c) => `${c.label}: ${c.oldValue} -> ${c.newValue}`),
    `View: ${viewUrl}`,
  ].join("\n");

  return { subject: `${eventTitle} has changed`, html, text };
}

export function renderReminderEmail(params: { recipientName: string; eventTitle: string; viewUrl: string }) {
  const { recipientName, eventTitle, viewUrl } = params;

  const html = shell(`
    <p style="margin:0 0 16px 0;">Hi ${recipientName},</p>
    <p style="margin:0 0 16px 0;">A reminder that you haven't responded to <strong>${eventTitle}</strong> yet.</p>
    <div style="margin-top:8px;">
      ${button("Respond now", viewUrl, "primary")}
    </div>
  `);

  const text = [
    `Hi ${recipientName},`,
    `A reminder that you haven't responded to ${eventTitle} yet.`,
    `Respond: ${viewUrl}`,
  ].join("\n");

  return { subject: `Reminder: ${eventTitle}`, html, text };
}

export function renderEmailCodeEmail(params: { otp: string }) {
  const { otp } = params;

  const html = shell(`
    <p style="margin:0 0 6px 0;font-family:${DISPLAY_FONT};font-style:italic;font-weight:bold;font-size:22px;color:${COLOR.ink};text-align:center;">Sign in to Callsheet</p>
    <p style="margin:0 0 24px 0;font-family:${BODY_FONT};font-size:13.5px;line-height:1.6;color:${COLOR.inkSoft};text-align:center;">Enter this code to sign in. It expires shortly and only works once.</p>
    <p style="margin:0 0 28px 0;padding:16px 14px;background-color:${COLOR.cream};border:1px solid ${COLOR.hairline};border-radius:8px;font-family:${MONO_FONT};font-size:28px;font-weight:bold;letter-spacing:8px;color:${COLOR.ink};text-align:center;">${otp}</p>
    <p style="margin:0;padding-top:20px;border-top:1px solid ${COLOR.hairline};font-family:${BODY_FONT};font-size:11.5px;line-height:1.6;color:${COLOR.inkFaint};text-align:center;">Didn't request this? You can safely ignore this email — no changes were made to your account.</p>
  `);

  const text = [
    "Sign in to Callsheet",
    "Enter this code to sign in. It expires shortly and only works once.",
    otp,
    "Didn't request this? You can safely ignore this email — no changes were made to your account.",
  ].join("\n\n");

  return { subject: "Your Callsheet sign-in code", html, text };
}

export function renderCrewInvitationEmail(params: {
  inviterName: string;
  filmName: string;
  roleTag: string | null;
  url: string;
}) {
  const { inviterName, filmName, roleTag, url } = params;

  const roleHtml = roleTag
    ? `<p style="margin:4px 0 0 0;font-family:${BODY_FONT};font-size:12.5px;color:${COLOR.inkSoft};text-transform:capitalize;text-align:center;">${roleTag}</p>`
    : "";

  const html = shell(`
    <div style="text-align:center;margin-bottom:18px;">
      ${avatarHtml(inviterName)}
    </div>
    <p style="margin:0 0 2px 0;font-family:${BODY_FONT};font-size:13.5px;color:${COLOR.inkSoft};text-align:center;">${inviterName} invited you to join</p>
    <p style="margin:0;font-family:${DISPLAY_FONT};font-style:italic;font-weight:bold;font-size:26px;color:${COLOR.burgundy};text-align:center;">${filmName}</p>
    ${roleHtml}
    <div style="text-align:center;margin:28px 0 20px 0;">
      ${button("Accept & set your availability", url, "primary")}
    </div>
    <p style="margin:0;padding-top:20px;border-top:1px solid ${COLOR.hairline};font-family:${BODY_FONT};font-size:11.5px;line-height:1.6;color:${COLOR.inkFaint};text-align:center;">We'll email you a sign-in code for this address, no password needed.</p>
  `);

  const text = [
    `${inviterName} added you to crew on ${filmName} on Callsheet.`,
    roleTag ?? "",
    `Accept: ${url}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { subject: `You've been added to crew on ${filmName}`, html, text };
}
