const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const prisma = require('../config/prisma');
const planService = require('../services/plan.service');
const enquiryController = require('../controllers/enquiryController');

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
  const { full_name, email, password, company_name, position } = req.body;

  if (!full_name || !email || !password || !company_name) {
    return res.status(400).json({ message: 'Full name, email, password, and company name are required.' });
  }

  // Normalise the email so it matches the lookup done at login (auth.routes.js
  // applies normalizeEmail()). Storing the raw value here would block login
  // after approval for any mixed-case or dotted address.
  const normalisedEmail = String(email).trim().toLowerCase();

  try {
    const existingRequest = await prisma.unregisteredUser.findFirst({ where: { email: normalisedEmail } });
    const existingUser = await prisma.user.findUnique({ where: { email: normalisedEmail } });
    if (existingRequest || existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    await prisma.unregisteredUser.create({
      data: {
        full_name,
        email: normalisedEmail,
        password: password_hash,
        company_name,
        position: position || null,
        role: 'ORG_ADMIN',
      },
    });

    res.status(201).json({ message: 'Registration submitted successfully.' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/v1/public/organisations/:id/subscription
// Records a subscription plan choice against an existing organisation.
// Called from the onboarding wizard after the admin's account is approved.
router.post('/organisations/:id/subscription', async (req, res, next) => {
  try {
    const orgId = parseInt(req.params.id, 10);
    const { plan_id } = req.body;

    if (!plan_id) {
      return res.status(400).json({ success: false, message: 'plan_id is required' });
    }

    const [org, plan] = await Promise.all([
      prisma.organisation.findUnique({ where: { organisation_id: orgId } }),
      prisma.subscriptionPlan.findFirst({ where: { plan_id: parseInt(plan_id, 10), is_active: true } }),
    ]);

    if (!org)  return res.status(404).json({ success: false, message: 'Organisation not found' });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found or inactive' });

    const start_date = new Date();
    const end_date   = new Date(start_date);
    end_date.setFullYear(end_date.getFullYear() + 1);

    const sub = await prisma.$transaction(async (tx) => {
      const created = await tx.subscription.create({
        data: {
          organisation_id: orgId,
          amount:     plan.price_monthly,
          start_date,
          end_date,
          status:     'ACTIVE',
        },
      });
      await tx.organisation.update({
        where: { organisation_id: orgId },
        data:  { active_subscription_id: created.subscription_id },
      });
      return created;
    });

    res.json({
      success: true,
      data: {
        subscription_id: sub.subscription_id,
        plan:            plan.name,
        amount:          Number(plan.price_monthly),
        status:          sub.status,
        start_date:      sub.start_date,
        end_date:        sub.end_date,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
