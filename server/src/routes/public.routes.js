const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const router = express.Router();
const prisma = require('../config/prisma');
const planService = require('../services/plan.service');
const enquiryController = require('../controllers/enquiryController');
const { checkEmailDeliverable, normaliseEmail } = require('../utils/emailValidator');
const { validateUEN } = require('../utils/uen');
const { sendVerificationEmail } = require('../services/email.service');

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function newVerificationToken() {
  return {
    token:   crypto.randomBytes(32).toString('hex'),
    expires: new Date(Date.now() + VERIFICATION_TTL_MS),
  };
}

// GET /api/v1/public/features — active landing features for the marketing site
router.get('/features', async (req, res, next) => {
  try {
    const features = await prisma.landingFeature.findMany({
      where:   { is_active: true },
      orderBy: { sort_order: 'asc' },
    });
    res.json({ success: true, data: features });
  } catch (err) { next(err); }
});

// GET /api/v1/public/pricing  — no auth required
router.get('/pricing', async (req, res, next) => {
  try {
    const plans = await planService.listPlans(false);
    res.json({ success: true, data: plans });
  } catch (err) { next(err); }
});

// POST /api/v1/public/enquiry
router.post('/enquiry', enquiryController.createEnquiry);

// POST /api/v1/public/organisations/register
router.post('/organisations/register', async (req, res) => {
  const { full_name, email, password, company_name, uen, position } = req.body;

  if (!full_name || !email || !password || !company_name || !uen) {
    return res.status(400).json({
      message: 'Full name, email, password, company name, and UEN are required.',
    });
  }

  // The applicant's UEN is what the system admin verifies the organisation against,
  // so a malformed one is rejected before the request is ever queued.
  const uenCheck = validateUEN(uen);
  if (!uenCheck.valid) return res.status(400).json({ message: uenCheck.reason });

  // Reject addresses that cannot possibly receive mail (bad syntax, disposable
  // provider, or a domain with no mail server) before we try to send anything.
  const emailCheck = await checkEmailDeliverable(email);
  if (!emailCheck.valid) return res.status(400).json({ message: emailCheck.reason });

  // Already canonicalised by checkEmailDeliverable via normaliseEmail() — the same
  // function every lookup uses, so what we store here is exactly what login and
  // password reset will search for.
  const normalisedEmail = emailCheck.email;

  try {
    const existingRequest = await prisma.unregisteredUser.findFirst({ where: { email: normalisedEmail } });
    const existingUser = await prisma.user.findUnique({ where: { email: normalisedEmail } });
    if (existingRequest || existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const uenTaken = await prisma.organisation.findFirst({ where: { uen: uenCheck.uen } });
    if (uenTaken) {
      return res.status(409).json({ message: 'An organisation with this UEN is already registered.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const { token, expires } = newVerificationToken();

    await prisma.unregisteredUser.create({
      data: {
        full_name,
        email: normalisedEmail,
        password: password_hash,
        company_name,
        uen: uenCheck.uen,
        position: position || null,
        role: 'ORG_ADMIN',
        email_verified: false,
        verification_token: token,
        verification_expires: expires,
      },
    });

    // The request is already persisted, so a mail failure (bad API key, unverified
    // sender, SendGrid outage) must not fail the registration — that would leave an
    // orphan row the applicant could never retry past, since the email is now taken.
    // They can request a fresh link from /resend-verification instead.
    let emailSent = true;
    try {
      await sendVerificationEmail({ to: normalisedEmail, name: full_name, token });
    } catch (mailErr) {
      emailSent = false;
      console.error('Failed to send verification email:', mailErr.message);
    }

    res.status(201).json({
      message: emailSent
        ? 'Registration submitted. Check your inbox to verify your email address.'
        : 'Registration submitted, but we could not send the verification email. Please use the resend option.',
      email: normalisedEmail,
      emailSent,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/v1/public/verify-email — applicant clicks the emailed link
router.post('/verify-email', async (req, res) => {
  const token = String(req.body.token ?? '').trim();
  if (!token) return res.status(400).json({ message: 'Verification token is required.' });

  try {
    const pending = await prisma.unregisteredUser.findUnique({ where: { verification_token: token } });
    if (!pending) {
      return res.status(400).json({ message: 'This verification link is invalid or has already been used.' });
    }
    if (pending.email_verified) {
      return res.json({ message: 'Your email is already verified. Our team is reviewing your registration.' });
    }
    if (pending.verification_expires && pending.verification_expires < new Date()) {
      return res.status(400).json({
        message: 'This verification link has expired. Request a new one below.',
        expired: true,
      });
    }

    await prisma.unregisteredUser.update({
      where: { marketing_user_id: pending.marketing_user_id },
      // The token is cleared so the link cannot be replayed.
      data: { email_verified: true, verification_token: null, verification_expires: null },
    });

    res.json({ message: 'Email verified. Our team will review your organisation and activate your account.' });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/v1/public/resend-verification
router.post('/resend-verification', async (req, res) => {
  const email = normaliseEmail(req.body.email);
  if (!email) return res.status(400).json({ message: 'Email address is required.' });

  // Always answer the same way so this cannot be used to enumerate registrations.
  const genericResponse = {
    message: 'If a pending registration exists for that address, a new verification link has been sent.',
  };

  try {
    const pending = await prisma.unregisteredUser.findFirst({ where: { email } });
    if (!pending || pending.email_verified) return res.json(genericResponse);

    const { token, expires } = newVerificationToken();
    await prisma.unregisteredUser.update({
      where: { marketing_user_id: pending.marketing_user_id },
      data: { verification_token: token, verification_expires: expires },
    });

    try {
      await sendVerificationEmail({ to: email, name: pending.full_name, token });
    } catch (mailErr) {
      // Logged, not surfaced — the response is deliberately identical either way
      // so this endpoint cannot be used to probe which addresses are registered.
      console.error('Failed to resend verification email:', mailErr.message);
    }
    res.json(genericResponse);
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
