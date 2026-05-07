// Thin wrapper around the Postmark transactional email HTTP API.
// Server-only — depends on POSTMARK_SERVER_TOKEN which must never reach the browser.

const POSTMARK_API_URL = 'https://api.postmarkapp.com/email'

interface SendEmailParams {
  to: string
  subject: string
  htmlBody: string
  textBody: string
}

export async function sendEmail({ to, subject, htmlBody, textBody }: SendEmailParams): Promise<void> {
  const token = process.env.POSTMARK_SERVER_TOKEN
  const from = process.env.POSTMARK_FROM_EMAIL

  if (!token || !from) {
    throw new Error(
      'Postmark not configured: POSTMARK_SERVER_TOKEN and POSTMARK_FROM_EMAIL are required.'
    )
  }

  const res = await fetch(POSTMARK_API_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': token,
    },
    body: JSON.stringify({
      From: from,
      To: to,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      MessageStream: 'outbound',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Postmark send failed (${res.status} ${res.statusText}): ${body}`)
  }
}
