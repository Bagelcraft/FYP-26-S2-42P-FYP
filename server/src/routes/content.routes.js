const express = require("express");
const router = express.Router();

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

router.get("/", getContent);

router.put("/hero", updateHero);
router.put("/video", updateVideo);
router.put("/pricing", updatePricing);

router.get("/features", getFeatures);
router.post("/features", createFeature);
router.put("/features/:id", updateFeature);
router.delete("/features/:id", deleteFeature);

router.get("/testimonials", getTestimonials);
router.post("/testimonials", createTestimonial);
router.put("/testimonials/:id", updateTestimonial);
router.delete("/testimonials/:id", deleteTestimonial);

module.exports = router;