// Table-based, inline-styled email HTML (design system §9) — real client
// compatibility matters more here than anywhere else in the app, so this
// deliberately doesn't reuse the Tailwind-driven component library. Font
// fallback: Playfair Display -> Georgia italic (display moments), Inter ->
// Arial/Helvetica (everything functional), per the design system's stack.

const DISPLAY_FONT = "'Playfair Display', Georgia, 'Times New Roman', serif";
const BODY_FONT = "'Inter', Arial, Helvetica, sans-serif";

const COLOR = {
  cream: "#fbf6ef",
  ink: "#3a2e28",
  inkSoft: "#8a7b6e",
  burgundy: "#6e1f2a",
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

function dateLineHtml(dateLabel: string, halfDayLabel: string, callTime: string) {
  return `<p style="margin:0 0 4px 0;font-family:${BODY_FONT};font-size:13.5px;color:${COLOR.ink};">${dateLabel} · ${halfDayLabel} · Call ${callTime}</p>`;
}

export type InviteEmailDay = { dateLabel: string; halfDayLabel: string; callTime: string };

export function renderInviteEmail(params: {
  recipientName: string;
  shootTitle: string;
  days: InviteEmailDay[];
  locationAddress: string | null;
  locationNotes: string | null;
  acceptUrl: string;
  declineUrl: string;
}) {
  const { recipientName, shootTitle, days, locationAddress, locationNotes, acceptUrl, declineUrl } = params;

  const daysHtml = days.map((d) => dateLineHtml(d.dateLabel, d.halfDayLabel, d.callTime)).join("");
  const locationHtml = locationAddress
    ? `<p style="margin:16px 0 0 0;font-family:${BODY_FONT};font-size:13.5px;color:${COLOR.inkSoft};">${locationAddress}</p>`
    : "";
  const notesHtml = locationNotes
    ? `<p style="margin:4px 0 0 0;font-family:${BODY_FONT};font-size:12.5px;font-style:italic;color:${COLOR.inkSoft};">${locationNotes}</p>`
    : "";

  const html = shell(`
    <p style="margin:0 0 16px 0;">Hi ${recipientName},</p>
    <p style="margin:0 0 16px 0;">You're invited to <strong>${shootTitle}</strong>.</p>
    ${daysHtml}
    ${locationHtml}
    ${notesHtml}
    <div style="margin-top:24px;">
      ${button("Accept", acceptUrl, "primary")}
      <span style="display:inline-block;width:10px;"></span>
      ${button("Decline", declineUrl, "secondary")}
    </div>
    <p style="margin:24px 0 0 0;font-size:12px;color:${COLOR.inkSoft};">A calendar invite for this shoot is attached, set to your call time.</p>
  `);

  const text = [
    `Hi ${recipientName},`,
    `You're invited to ${shootTitle}.`,
    ...days.map((d) => `${d.dateLabel} - ${d.halfDayLabel} - Call ${d.callTime}`),
    locationAddress ?? "",
    locationNotes ?? "",
    `Accept: ${acceptUrl}`,
    `Decline: ${declineUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: `You're invited: ${shootTitle}`, html, text };
}

export type ChangeField = { label: string; oldValue: string; newValue: string };

export function renderChangeNotificationEmail(params: {
  recipientName: string;
  shootTitle: string;
  changes: ChangeField[];
  viewUrl: string;
}) {
  const { recipientName, shootTitle, changes, viewUrl } = params;

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
    <p style="margin:0 0 16px 0;"><strong>${shootTitle}</strong> has changed.</p>
    ${changesHtml}
    <div style="margin-top:24px;">
      ${button("View shoot", viewUrl, "primary")}
    </div>
    <p style="margin:24px 0 0 0;font-size:12px;color:${COLOR.inkSoft};">An updated calendar invite is attached, replacing the previous one.</p>
  `);

  const text = [
    `Hi ${recipientName},`,
    `${shootTitle} has changed.`,
    ...changes.map((c) => `${c.label}: ${c.oldValue} -> ${c.newValue}`),
    `View: ${viewUrl}`,
  ].join("\n");

  return { subject: `${shootTitle} has changed`, html, text };
}

export function renderReminderEmail(params: { recipientName: string; shootTitle: string; viewUrl: string }) {
  const { recipientName, shootTitle, viewUrl } = params;

  const html = shell(`
    <p style="margin:0 0 16px 0;">Hi ${recipientName},</p>
    <p style="margin:0 0 16px 0;">A reminder that you haven't responded to <strong>${shootTitle}</strong> yet.</p>
    <div style="margin-top:8px;">
      ${button("Respond now", viewUrl, "primary")}
    </div>
  `);

  const text = [
    `Hi ${recipientName},`,
    `A reminder that you haven't responded to ${shootTitle} yet.`,
    `Respond: ${viewUrl}`,
  ].join("\n");

  return { subject: `Reminder: ${shootTitle}`, html, text };
}
