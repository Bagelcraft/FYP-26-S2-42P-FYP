const prisma = require("../config/prisma");
const { DEFAULT_LANDING_FEATURES } = require("../utils/landingDefaults");
const moderation = require("../services/testimonialModeration.service");

const getOrCreateContent = async () => {
  let content = await prisma.landingContent.findFirst();

  if (!content) {
    content = await prisma.landingContent.create({
      data: {
        hero_title: "Smart Workforce & Task Allocation",
        hero_subtitle:
          "Run your work by project or by shift — whichever fits your company.\nAssign tasks to the right people automatically and track progress in real time.",
      },
    });
  }

  return content;
};

// Seed the marketing page with the product's real feature list the first time it
// is read, so a fresh install never renders an empty Features section.
const getOrSeedFeatures = async ({ activeOnly }) => {
  const total = await prisma.landingFeature.count();
  if (total === 0) {
    await prisma.landingFeature.createMany({ data: DEFAULT_LANDING_FEATURES });
  }

  return prisma.landingFeature.findMany({
    where: activeOnly ? { is_active: true } : undefined,
    orderBy: { sort_order: "asc" },
  });
};

exports.getContent = async (req, res) => {
  try {
    const content = await getOrCreateContent();
    const features = await getOrSeedFeatures({ activeOnly: true });

    // Only rule-approved testimonials are public; best-scoring first.
    const testimonials = await prisma.landingTestimonial.findMany({
      where: { is_active: true },
      orderBy: [{ auto_score: "desc" }, { created_at: "desc" }],
    });

    res.json({ content, features, testimonials });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch content", error: error.message });
  }
};

exports.updateHero = async (req, res) => {
  try {
    const content = await getOrCreateContent();
    const { hero_title, hero_subtitle, hero_image_url } = req.body;

    const updated = await prisma.landingContent.update({
      where: { id: content.id },
      data: { hero_title, hero_subtitle, hero_image_url },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update hero", error: error.message });
  }
};

exports.updateVideo = async (req, res) => {
  try {
    const content = await getOrCreateContent();
    const { video_title, video_subtitle, video_url } = req.body;

    const updated = await prisma.landingContent.update({
      where: { id: content.id },
      data: { video_title, video_subtitle, video_url },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update video", error: error.message });
  }
};

exports.updatePricing = async (req, res) => {
  try {
    const content = await getOrCreateContent();
    const { plan_name, plan_price, plan_description } = req.body;

    const updated = await prisma.landingContent.update({
      where: { id: content.id },
      data: { plan_name, plan_price, plan_description },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update pricing", error: error.message });
  }
};

exports.getFeatures = async (req, res) => {
  try {
    res.json(await getOrSeedFeatures({ activeOnly: false }));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch features", error: error.message });
  }
};

exports.createFeature = async (req, res) => {
  try {
    const { title, description, icon, sort_order } = req.body;

    const feature = await prisma.landingFeature.create({
      data: { title, description, icon: icon || null, sort_order: sort_order ?? 0 },
    });

    res.status(201).json(feature);
  } catch (error) {
    res.status(500).json({ message: "Failed to create feature", error: error.message });
  }
};

exports.updateFeature = async (req, res) => {
  try {
    const { title, description, icon, sort_order, is_active } = req.body;

    const feature = await prisma.landingFeature.update({
      where: { feature_id: parseInt(req.params.id) },
      data: { title, description, icon, sort_order, is_active },
    });

    res.json(feature);
  } catch (error) {
    res.status(500).json({ message: "Failed to update feature", error: error.message });
  }
};

exports.deleteFeature = async (req, res) => {
  try {
    await prisma.landingFeature.delete({
      where: { feature_id: parseInt(req.params.id) },
    });

    res.json({ message: "Feature deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete feature", error: error.message });
  }
};

exports.getTestimonials = async (req, res) => {
  try {
    const testimonials = await prisma.landingTestimonial.findMany({
      orderBy: { created_at: "desc" },
    });

    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch testimonials", error: error.message });
  }
};

// The publication rules the automated selector applies — surfaced so the admin UI
// can explain the decisions instead of offering a manual override.
exports.getTestimonialRules = async (req, res) => {
  res.json({ rules: moderation.RULES });
};

// Every write runs the full selection so the landing page always reflects the
// current best set — a new arrival can displace nothing, but an edit or deletion
// can free a slot that a queued testimonial should immediately take.
const settle = async (testimonialId) => {
  await moderation.reevaluateAll();
  const row = await prisma.landingTestimonial.findUnique({
    where: { testimonial_id: testimonialId },
  });
  return {
    ...row,
    moderation: {
      status:  row.auto_status,
      score:   row.auto_score,
      reasons: row.auto_reasons ? [row.auto_reasons] : [],
    },
  };
};

exports.createTestimonial = async (req, res) => {
  try {
    const { name, company, rating, review_text } = req.body;
    const submitted = { name, company, rating: rating ?? 5, review_text };

    // Publication is decided here, by rule — never by hand afterwards.
    const { row } = await moderation.evaluateAgainstLive(submitted);

    const created = await prisma.landingTestimonial.create({
      data: { ...submitted, ...row },
    });

    res.status(201).json(await settle(created.testimonial_id));
  } catch (error) {
    res.status(500).json({ message: "Failed to create testimonial", error: error.message });
  }
};

exports.updateTestimonial = async (req, res) => {
  try {
    const testimonialId = parseInt(req.params.id);
    const existing = await prisma.landingTestimonial.findUnique({
      where: { testimonial_id: testimonialId },
    });
    if (!existing) return res.status(404).json({ message: "Testimonial not found" });

    const { name, company, rating, review_text } = req.body;

    const data = {};
    if (name        !== undefined) data.name        = name;
    if (company     !== undefined) data.company     = company;
    if (rating      !== undefined) data.rating      = rating;
    if (review_text !== undefined) data.review_text = review_text;
    // NOTE: is_active is intentionally not accepted from the client. Whether a
    // testimonial appears on the landing page is decided by the rules below.

    const { row } = await moderation.evaluateAgainstLive(
      { ...existing, ...data },
      testimonialId,
    );

    await prisma.landingTestimonial.update({
      where: { testimonial_id: testimonialId },
      data: { ...data, ...row },
    });

    res.json(await settle(testimonialId));
  } catch (error) {
    res.status(500).json({ message: "Failed to update testimonial", error: error.message });
  }
};

// Re-runs the rules over every testimonial and refills the landing-page slots by
// score. Used after the rules change, or to fill a slot freed by a deletion.
exports.reevaluateTestimonials = async (req, res) => {
  try {
    const summary = await moderation.reevaluateAll();
    const testimonials = await prisma.landingTestimonial.findMany({
      orderBy: { created_at: "desc" },
    });

    res.json({ ...summary, testimonials });
  } catch (error) {
    res.status(500).json({ message: "Failed to re-evaluate testimonials", error: error.message });
  }
};

exports.deleteTestimonial = async (req, res) => {
  try {
    await prisma.landingTestimonial.delete({
      where: { testimonial_id: parseInt(req.params.id) },
    });

    // Deleting a published testimonial frees a landing-page slot — refill it from
    // the queue straight away rather than leaving a gap until the next submission.
    const summary = await moderation.reevaluateAll();

    res.json({ message: "Testimonial deleted successfully", ...summary });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete testimonial", error: error.message });
  }
};