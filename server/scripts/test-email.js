/**
 * Send a one-off test email to prove the SendGrid configuration works.
 *
 *   node scripts/test-email.js                 # sends to FROM_EMAIL (yourself)
 *   node scripts/test-email.js you@example.com # sends to a specific address
 *
 * Reports the exact SendGrid rejection reason on failure, which is otherwise
 * swallowed by the registration route's non-fatal mail handling.
 */
require('dotenv').config();
const { sendMail } = require('../src/services/email.service');

const to = process.argv[2] || process.env.FROM_EMAIL;

async function main() {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY is not set — the mailer would only log to console.');
    process.exit(1);
  }
  if (!to) {
    console.error('No recipient. Pass one as an argument or set FROM_EMAIL.');
    process.exit(1);
  }

  console.log(`From : ${process.env.FROM_EMAIL}`);
  console.log(`To   : ${to}\nSending…`);

  const result = await sendMail({
    to,
    subject: 'SmartTask — SendGrid test',
    html: '<p>If you are reading this, SendGrid is configured correctly.</p>',
  });

  console.log(result.sent ? '\n✅ Accepted by SendGrid. Check the inbox (and spam).'
                          : `\n⚠️  Not sent: ${result.reason}`);
}

main().catch((err) => {
  console.error('\n❌ SendGrid rejected the send.');
  console.error(`   ${err.message}`);
  // SendGrid returns the actionable detail in the response body, not the message.
  const errors = err.response?.body?.errors;
  if (errors) for (const e of errors) console.error(`   → ${e.message}${e.field ? ` (field: ${e.field})` : ''}`);
  console.error('\nCommon causes:');
  console.error('  403 verified Sender Identity → FROM_EMAIL is not the address you verified in SendGrid');
  console.error('  401 unauthorized             → API key wrong, revoked, or lacks Mail Send permission');
  process.exit(1);
});
