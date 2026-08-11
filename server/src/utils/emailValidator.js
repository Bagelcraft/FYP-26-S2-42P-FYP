const dns = require('dns').promises;

// Proving an address is genuinely deliverable is done in two stages:
//
//   1. checkEmailDeliverable() — cheap, synchronous-ish gate run at registration.
//      Rejects malformed syntax, throwaway/disposable domains, and domains whose
//      DNS has no mail exchanger (i.e. nothing can ever receive mail there).
//   2. A verification link mailed to the address (see auth.service / public.routes).
//      Only clicking that link proves the mailbox actually exists and belongs to
//      the applicant. Stage 1 alone cannot prove that — SMTP RCPT probing is
//      unreliable and gets the sender blocklisted, so we deliberately don't do it.
//
// Login is gated on stage 2 (User.email_verified), not stage 1.

// RFC-5322-practical: no consecutive/leading/trailing dots, a real TLD.
const EMAIL_RE = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

// Throwaway inbox providers — an address here is "real" but worthless for an
// account that has to be reachable later.
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', '20minutemail.com', 'anonbox.net', 'burnermail.io',
  'dispostable.com', 'emailondeck.com', 'fakeinbox.com', 'getairmail.com',
  'getnada.com', 'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.net',
  'inboxbear.com', 'mailcatch.com', 'maildrop.cc', 'mailinator.com',
  'mailnesia.com', 'mintemail.com', 'moakt.com', 'mohmal.com',
  'mytemp.email', 'sharklasers.com', 'spam4.me', 'spamgourmet.com',
  'temp-mail.org', 'tempinbox.com', 'tempmail.com', 'tempmail.net',
  'tempmailo.com', 'throwawaymail.com', 'trashmail.com', 'trbvm.com',
  'yopmail.com', 'yopmail.fr', 'yopmail.net',
]);

// Domains that exist purely as examples/placeholders and never accept mail.
const RESERVED_DOMAINS = new Set([
  'example.com', 'example.net', 'example.org', 'example.edu',
]);

// RFC 2606 / RFC 6761 reserved TLDs. These are guaranteed never to resolve, so an
// address on one can never receive mail — but they are also exactly what this
// project's seed data and test scripts use (@acme.test, @sta.test, *.test.local).
//
// So: rejected in production, allowed everywhere else (and skipped by the DNS
// check, which would always fail for them). Without this carve-out, adding staff
// with a .test address — the documented test convention — returns a 400.
const RESERVED_TLDS = new Set(['test', 'example', 'invalid', 'localhost', 'local']);

const isProduction = () => process.env.NODE_ENV === 'production';

function isReservedDomain(domain) {
  return RESERVED_DOMAINS.has(domain) || RESERVED_TLDS.has(domain.split('.').pop());
}

// The single canonical form for every email in the system. Storage and every
// lookup must agree, so this is the only normalisation allowed anywhere.
//
// Deliberately NOT express-validator's normalizeEmail(): that applies
// provider-specific aliasing, stripping dots and +tags from Gmail addresses
// ("basil.hia@gmail.com" -> "basilhia@gmail.com"). Registration stores the
// address as typed-but-lowercased, so any route normalising the other way looks
// up an address that was never stored — silently breaking login and password
// reset for every Gmail user with a dot in their address.
function normaliseEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

// express-validator sanitiser wrapper, so routes can swap `.normalizeEmail()`
// for `.customSanitizer(normaliseEmailSanitizer)` and stay consistent.
const normaliseEmailSanitizer = (value) => normaliseEmail(value);

function domainOf(email) {
  return normaliseEmail(email).split('@')[1] ?? '';
}

/**
 * Format-only check. Cheap and offline — safe to call anywhere, including tests.
 * @returns {{ valid: boolean, reason?: string }}
 */
function checkEmailFormat(email) {
  const value = normaliseEmail(email);

  if (!value) return { valid: false, reason: 'Email address is required.' };
  if (value.length > 150) return { valid: false, reason: 'Email address is too long.' };
  if (!EMAIL_RE.test(value)) return { valid: false, reason: 'That is not a valid email address.' };

  const domain = domainOf(value);
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, reason: 'Disposable email addresses are not accepted. Please use your work email.' };
  }
  if (isReservedDomain(domain)) {
    if (isProduction()) {
      return { valid: false, reason: 'That email domain cannot receive mail. Please use a real address.' };
    }
    // Test/seed fixture outside production — allowed, but there is no point
    // asking DNS about a domain that is defined never to resolve.
    return { valid: true, reserved: true };
  }

  return { valid: true };
}

/**
 * Does this domain publish a mail exchanger? A domain with no MX (and no A record
 * fallback) can never receive mail, so the address cannot be real.
 *
 * Network failures are treated as "cannot disprove" and allowed through — a flaky
 * resolver must not block a legitimate signup. The emailed verification link is
 * the backstop.
 */
async function hasMailExchanger(domain) {
  try {
    const records = await dns.resolveMx(domain);
    if (records && records.length > 0 && records.some((r) => r.exchange)) return true;
  } catch (err) {
    // ENOTFOUND / ENODATA = the domain really has no MX. Anything else is a
    // resolver problem on our side.
    if (err.code !== 'ENOTFOUND' && err.code !== 'ENODATA') return true;
  }

  // RFC 5321 §5.1: with no MX, a host's A/AAAA record is an implicit mail target.
  try {
    const addresses = await dns.resolve4(domain);
    return Array.isArray(addresses) && addresses.length > 0;
  } catch (err) {
    if (err.code !== 'ENOTFOUND' && err.code !== 'ENODATA') return true;
    return false;
  }
}

/**
 * Full deliverability gate: format + disposable + live DNS MX lookup.
 *
 * `checkDomain: false` keeps the syntax and disposable-provider checks but skips
 * the DNS lookup. That is what the system admin's per-flow switches turn off:
 * a company using an internal domain, or one whose DNS is still being set up,
 * has no MX record and would otherwise be unable to register or hire anyone.
 *
 * @returns {Promise<{ valid: boolean, reason?: string, email?: string }>}
 */
async function checkEmailDeliverable(email, { checkDomain = true } = {}) {
  const format = checkEmailFormat(email);
  if (!format.valid) return format;

  const value = normaliseEmail(email);
  const domain = domainOf(value);

  // Reserved TLDs never resolve by definition — asking DNS is a guaranteed miss.
  if (format.reserved) return { valid: true, email: value };
  if (!checkDomain) return { valid: true, email: value };

  if (!(await hasMailExchanger(domain))) {
    return {
      valid: false,
      reason: `No mail server is configured for "${domain}", so that address cannot receive email.`,
    };
  }

  return { valid: true, email: value };
}

module.exports = {
  normaliseEmail,
  normaliseEmailSanitizer,
  isReservedDomain,
  domainOf,
  checkEmailFormat,
  checkEmailDeliverable,
  hasMailExchanger,
  DISPOSABLE_DOMAINS,
};
