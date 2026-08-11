-- Testimonials had no author, so any manager could list, edit and delete every
-- other organisation's review. Record who submitted each one.
-- Existing rows keep NULL: nobody claims them, so they stay admin-managed.
ALTER TABLE "LandingTestimonial" ADD COLUMN "submitted_by" INTEGER;
ALTER TABLE "LandingTestimonial"
  ADD CONSTRAINT "LandingTestimonial_submitted_by_fkey"
  FOREIGN KEY ("submitted_by") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
