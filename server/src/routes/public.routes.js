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

// PUT /api/v1/public/organisations/:id/details
router.put('/organisations/:id/details', (req, res) => {
  res.json({ message: 'Submit org details — to be implemented by Rachel' });
});

// POST /api/v1/public/organisations/:id/subscription
router.post('/organisations/:id/subscription', (req, res) => {
  res.json({ message: 'Choose subscription plan — to be implemented by Rachel' });
});

module.exports = router;
