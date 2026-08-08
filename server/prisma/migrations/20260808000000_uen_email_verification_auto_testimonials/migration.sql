-- Organisation UEN (Singapore Unique Entity Number)
ALTER TABLE "Organisation" ADD COLUMN "uen" VARCHAR(20);
CREATE UNIQUE INDEX "Organisation_uen_key" ON "Organisation"("uen");

-- Email ownership verification. Existing accounts are grandfathered in as verified
-- so the new login gate does not lock anyone out.
ALTER TABLE "User" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT true;

-- Pending registrations: UEN + emailed-link verification
ALTER TABLE "UnregisteredUser" ADD COLUMN "uen" VARCHAR(20);
ALTER TABLE "UnregisteredUser" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UnregisteredUser" ADD COLUMN "verification_token" VARCHAR(255);
ALTER TABLE "UnregisteredUser" ADD COLUMN "verification_expires" TIMESTAMP(3);
CREATE UNIQUE INDEX "UnregisteredUser_verification_token_key" ON "UnregisteredUser"("verification_token");

-- Automated testimonial moderation. Publication is now rule-driven, so the default
-- flips to false and every existing row is re-queued for the rules engine.
ALTER TABLE "LandingTestimonial" ADD COLUMN "auto_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING';
ALTER TABLE "LandingTestimonial" ADD COLUMN "auto_score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LandingTestimonial" ADD COLUMN "auto_reasons" TEXT;
ALTER TABLE "LandingTestimonial" ADD COLUMN "moderated_at" TIMESTAMP(3);
ALTER TABLE "LandingTestimonial" ALTER COLUMN "is_active" SET DEFAULT false;

-- Notifications feature removed
DROP TABLE IF EXISTS "Notification";
