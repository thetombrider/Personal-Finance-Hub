import { Resend } from 'resend';

export async function getUncachableResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY not found in environment variables');
  }

  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export async function sendEmail(to: string, subject: string, html: string) {
  const { client, fromEmail } = await getUncachableResendClient();

  const result = await client.emails.send({
    from: fromEmail,
    to,
    subject,
    html
  });

  return result;
}
