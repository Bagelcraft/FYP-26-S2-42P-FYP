const sgMail = require('@sendgrid/mail');

// Single place that talks to SendGrid. When no API key is configured (local dev,
// CI) the message is logged instead of sent so flows stay testable end-to-end.
async function sendMail({ to, subject, html }) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[DEV] Email to ${to} — ${subject}\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`);
    return { sent: false, reason: 'SENDGRID_API_KEY not configured' };
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  await sgMail.send({
    to,
    from: process.env.FROM_EMAIL || 'noreply@smarttask.com',
    subject,
    html,
  });
  return { sent: true };
}

function clientUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
}

async function sendVerificationEmail({ to, name, token }) {
  const verifyUrl = `${clientUrl()}/verify-email?token=${token}`;
  return sendMail({
    to,
    subject: 'SmartTask — Verify your email address',
    html: `
      <p>Hi ${name || 'there'},</p>
      <p>Thanks for registering your organisation with SmartTask. Confirm this email address
         so we know we can reach you — the link expires in <strong>24 hours</strong>.</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>Once verified, our team will review your organisation's UEN and activate your account.</p>
      <p>If you didn't register with SmartTask, you can safely ignore this email.</p>
    `,
  });
}

async function sendRegistrationApprovedEmail({ to, name }) {
  return sendMail({
    to,
    subject: 'SmartTask — Your organisation has been approved',
    html: `
      <p>Hi ${name || 'there'},</p>
      <p>Your organisation has been verified and approved. You can now sign in with the
         email and password you registered with.</p>
      <p><a href="${clientUrl()}/login">${clientUrl()}/login</a></p>
    `,
  });
}

module.exports = { sendMail, sendVerificationEmail, sendRegistrationApprovedEmail };
