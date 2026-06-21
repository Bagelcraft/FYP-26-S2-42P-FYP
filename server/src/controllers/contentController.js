const prisma = require("../config/prisma");

const getOrCreateContent = async () => {
  let content = await prisma.landingContent.findFirst();

  if (!content) {
    content = await prisma.landingContent.create({
      data: {
        hero_title: "Smart Workforce & Task Allocation",
        hero_subtitle: "Manage your workforce. Assign tasks. Track progress in real time.",
      },
    });
  }

  return content;
};

exports.getContent = async (req, res) => {
  try {
    const content = await getOrCreateContent();

    const features = await prisma.landingFeature.findMany({
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
    });

    const testimonials = await prisma.landingTestimonial.findMany({
      where: { is_active: true },
      orderBy: { created_at: "desc" },
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
    const features = await prisma.landingFeature.findMany({
      orderBy: { sort_order: "asc" },
    });

    res.json(features);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch features", error: error.message });
  }
};

exports.createFeature = async (req, res) => {
  try {
    const { title, description, icon_url, sort_order } = req.body;

    const feature = await prisma.landingFeature.create({
      data: { title, description, icon_url, sort_order },
    });

    res.status(201).json(feature);
  } catch (error) {
    res.status(500).json({ message: "Failed to create feature", error: error.message });
  }
};

exports.updateFeature = async (req, res) => {
  try {
    const { title, description, icon_url, sort_order, is_active } = req.body;

    const feature = await prisma.landingFeature.update({
      where: { feature_id: parseInt(req.params.id) },
      data: { title, description, icon_url, sort_order, is_active },
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

exports.createTestimonial = async (req, res) => {
  try {
    const { name, company, rating, review_text, profile_image } = req.body;

    const testimonial = await prisma.landingTestimonial.create({
      data: { name, company, rating, review_text, profile_image },
    });

    res.status(201).json(testimonial);
  } catch (error) {
    res.status(500).json({ message: "Failed to create testimonial", error: error.message });
  }
};

// Managers edit testimonial *content* only — visibility (is_active) is the
// system admin's decision and is updated via setTestimonialVisibility.
exports.updateTestimonial = async (req, res) => {
  try {
    const { name, company, rating, review_text, profile_image } = req.body;

    const testimonial = await prisma.landingTestimonial.update({
      where: { testimonial_id: parseInt(req.params.id) },
      data: { name, company, rating, review_text, profile_image },
    });

    res.json(testimonial);
  } catch (error) {
    res.status(500).json({ message: "Failed to update testimonial", error: error.message });
  }
};

// System admin chooses which testimonials are shown on the marketing site.
exports.setTestimonialVisibility = async (req, res) => {
  try {
    const testimonial = await prisma.landingTestimonial.update({
      where: { testimonial_id: parseInt(req.params.id) },
      data: { is_active: !!req.body.is_active },
    });

    res.json(testimonial);
  } catch (error) {
    res.status(500).json({ message: "Failed to update testimonial visibility", error: error.message });
  }
};

exports.deleteTestimonial = async (req, res) => {
  try {
    await prisma.landingTestimonial.delete({
      where: { testimonial_id: parseInt(req.params.id) },
    });

    res.json({ message: "Testimonial deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete testimonial", error: error.message });
  }
};