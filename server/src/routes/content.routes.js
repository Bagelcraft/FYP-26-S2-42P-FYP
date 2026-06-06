const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth.middleware");

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
  deleteTestimonial,
} = require("../controllers/contentController");

// Public route
router.get("/", getContent);

// Protected routes
router.put("/hero", verifyToken, updateHero);
router.put("/video", verifyToken, updateVideo);
router.put("/pricing", verifyToken, updatePricing);

// Features
router.get("/features", getFeatures); // public
router.post("/features", verifyToken, createFeature);
router.put("/features/:id", verifyToken, updateFeature);
router.delete("/features/:id", verifyToken, deleteFeature);

// Testimonials
router.get("/testimonials", getTestimonials); // public
router.post("/testimonials", verifyToken, createTestimonial);
router.put("/testimonials/:id", verifyToken, updateTestimonial);
router.delete("/testimonials/:id", verifyToken, deleteTestimonial);

module.exports = router;