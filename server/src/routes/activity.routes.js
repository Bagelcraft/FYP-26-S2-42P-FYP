const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const activityService = require('../services/activity.service');

const router = express.Router();

// GET /api/v1/activity/badges — outstanding-item counts per nav tab for the
// caller's own role and organisation. Drives the sidebar red dot.
router.get('/badges', verifyToken, async (req, res, next) => {
  try {
    res.json({ success: true, data: await activityService.getBadges(req.user) });
  } catch (err) { next(err); }
});

module.exports = router;
