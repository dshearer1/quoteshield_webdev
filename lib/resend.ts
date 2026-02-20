import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM;

let resend: Resend | null = null;

export function getResend(): Resend {
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  if (!resend) resend = new Resend(apiKey);
  return resend;
}

export async function sendReportReadyEmail(args: {
  to: string;
  reportUrl: string;
}) {
  if (!from) throw new Error("Missing RESEND_FROM");
  await getResend().emails.send({
    from,
    to: args.to,
    subject: "Your QuoteShield report is ready",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Your report is ready</h2>
        <p>View your quote review here:</p>
        <p><a href="${args.reportUrl}" target="_blank" rel="noreferrer">${args.reportUrl}</a></p>
        <p style="color:#666;font-size:12px;">This link is private; do not share it.</p>
      </div>
    `,
  });
}
