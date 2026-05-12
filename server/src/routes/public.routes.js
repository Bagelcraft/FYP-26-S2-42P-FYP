const express = require('express');
const router = express.Router();

// GET /api/v1/public/features
router.get('/features', (req, res) => {
  res.json({ message: 'Get platform features — to be implemented by Rachel' });
});

// GET /api/v1/public/pricing
router.get('/pricing', (req, res) => {
  res.json({ message: 'Get pricing plans — to be implemented by Rachel' });
});

// POST /api/v1/public/enquiry
router.post('/enquiry', (req, res) => {
  res.json({ message: 'Submit enquiry — to be implemented by Rachel' });
});

// POST /api/v1/public/organisations/register
router.post('/organisations/register', (req, res) => {
  res.json({ message: 'Register organisation — to be implemented by Rachel' });
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
