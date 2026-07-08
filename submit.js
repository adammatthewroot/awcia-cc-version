// Vercel serverless function: receives the website form POSTs and relays
// them by email through Resend (https://resend.com).
//
// SETUP (do these once):
//   1. Create a Resend account and an API key.
//   2. In Vercel: Project Settings > Environment Variables, add
//      RESEND_API_KEY = your key.  Never commit the key to the repo.
//   3. Edit the two constants below (TO_EMAIL and FROM_EMAIL).
//   4. Redeploy so the env var takes effect.

// Where form submissions are delivered:
const TO_EMAIL = 'steve.a.root.ccm@gmail.com';

// The "from" address. It must be on a domain you have verified in Resend.
// For a quick test before verifying your own domain, you may use
// 'AWCIA Website <onboarding@resend.dev>'.
const FROM_EMAIL = 'AWCIA Website <notifications@awcia.com';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const data = req.body || {};

  // Honeypot: real visitors leave this hidden field empty. Bots fill it.
  // Silently accept so the bot gets no signal, but send nothing.
  if (data._gotcha) {
    return res.status(200).json({ ok: true });
  }

  if (!data.email || !data.name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const formType = data._form === 'contact' ? 'Contact' : 'Membership Inquiry';

  // Build a readable email body from every submitted field.
  const body = Object.entries(data)
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: data.email,
        subject: `AWCIA ${formType} from ${data.name}`,
        text: body,
      }),
    });

    if (response.ok) {
      return res.status(200).json({ ok: true });
    }

    const detail = await response.text();
    console.error('Resend error', response.status, detail);
    return res.status(502).json({ error: 'Email service error' });
  } catch (err) {
    console.error('Handler error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
