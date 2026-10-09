export async function sendEmail(input: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.EMAIL_FROM?.trim()
  if (!apiKey || !from) throw new Error('Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM.')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('Email delivery failed.')
}
