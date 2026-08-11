const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/rbac.middleware");

const {
  getContent,
  updateHero,
  updateVideo,
  updatePricing,
  getFeatures,
  createFeature,
  updateFeature,
  deleteFeature,
  getTestimonials,
  getTestimonialRules,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  reevaluateTestimonials,
} = require("../controllers/contentController");

const adminOnly = [verifyToken, requireRole(["SYSTEM_ADMIN"])];
// Testimonials content is managed by managers; admins can manage them too.
const testimonialWriters = [verifyToken, requireRole(["SYSTEM_ADMIN", "PROJECT_MANAGER"])];

// Public reads (used by the landing page)
router.get("/", getContent);
router.get("/features", getFeatures);
router.get("/testimonials", ...testimonialWriters, getTestimonials);
router.get("/testimonials/rules", getTestimonialRules);

// Admin-only writes
router.put("/hero",    ...adminOnly, updateHero);
router.put("/video",   ...adminOnly, updateVideo);
router.put("/pricing", ...adminOnly, updatePricing);

router.post("/features",        ...adminOnly, createFeature);
router.put("/features/:id",     ...adminOnly, updateFeature);
router.delete("/features/:id",  ...adminOnly, deleteFeature);

router.post("/testimonials",        ...testimonialWriters, createTestimonial);
router.put("/testimonials/:id",     ...testimonialWriters, updateTestimonial);
router.delete("/testimonials/:id",  ...testimonialWriters, deleteTestimonial);

// Re-run the automated selection over every testimonial. There is deliberately no
// endpoint to publish or hide one by hand — the rules decide.
router.post("/testimonials/reevaluate", ...adminOnly, reevaluateTestimonials);

module.exports = router;