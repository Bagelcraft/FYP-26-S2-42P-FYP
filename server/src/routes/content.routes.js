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
  createTestimonial,
  updateTestimonial,
  setTestimonialVisibility,
  deleteTestimonial,
} = require("../controllers/contentController");

const adminOnly = [verifyToken, requireRole(["SYSTEM_ADMIN"])];
const managerOnly = [verifyToken, requireRole(["PROJECT_MANAGER"])];

// ─── Public reads (marketing site + both editors) ─────────────
router.get("/", getContent);
router.get("/features", getFeatures);
router.get("/testimonials", getTestimonials);

// ─── Text content & features — system admin ───────────────────
router.put("/hero", adminOnly, updateHero);
router.put("/video", adminOnly, updateVideo);
router.put("/pricing", adminOnly, updatePricing);

router.post("/features", adminOnly, createFeature);
router.put("/features/:id", adminOnly, updateFeature);
router.delete("/features/:id", adminOnly, deleteFeature);

// ─── Testimonials ─────────────────────────────────────────────
// Content (create/edit/delete) is owned by managers; the system admin only
// toggles which testimonials are shown on the public site.
router.post("/testimonials", managerOnly, createTestimonial);
router.put("/testimonials/:id", managerOnly, updateTestimonial);
router.delete("/testimonials/:id", managerOnly, deleteTestimonial);
router.patch("/testimonials/:id/visibility", adminOnly, setTestimonialVisibility);

module.exports = router;
