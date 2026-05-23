const express = require('express');
const router = express.Router();
const {
  createEnquiry,
  getAllEnquiries,
  getEnquiryById,
  respondToEnquiry,
  deleteEnquiry
} = require("../controllers/enquiryController");

// GET /api/v1/admin/health
router.get('/health', (req, res) => {
  res.json({ message: 'System health endpoint — to be implemented by Daniel' });
});

// GET /api/v1/admin/organisations
router.get('/organisations', (req, res) => {
  res.json({ message: 'Get all organisations — to be implemented by Daniel' });
});

// POST /api/v1/admin/organisations
router.post('/organisations', (req, res) => {
  res.json({ message: 'Create organisation — to be implemented by Daniel' });
});

// PUT /api/v1/admin/organisations/:id/suspend
router.put('/organisations/:id/suspend', (req, res) => {
  res.json({ message: 'Suspend organisation — to be implemented by Daniel' });
});

// GET /api/v1/admin/logs
router.get('/logs', (req, res) => {
  res.json({ message: 'Get audit logs — to be implemented by Daniel' });
});


/*
|--------------------------------------------------------------------------
| Contact Enquiry Routes
|--------------------------------------------------------------------------
*/

router.post("/enquiries", createEnquiry);

router.get("/enquiries", getAllEnquiries);

router.get(
  "/enquiries/:id",
  getEnquiryById
);

router.put(
  "/enquiries/:id/respond",
  respondToEnquiry
);

router.delete(
  "/enquiries/:id",
  deleteEnquiry
);

module.exports = router;
