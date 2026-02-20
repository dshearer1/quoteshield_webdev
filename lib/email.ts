import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendReportReadyEmail(args: {
  to: string;
  reportUrl: string;
  submissionId: string;
}) {
  const { to, reportUrl, submissionId } = args;

  await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to,
    subject: "Your QuoteShield report is ready ✅",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Your report is ready ✅</h2>
        <p>View it here:</p>
        <p><a href="${reportUrl}" target="_blank" rel="noreferrer">${reportUrl}</a></p>
        <p style="color:#666;font-size:12px;">Submission ID: ${submissionId}</p>
      </div>
    `,
  });
}
