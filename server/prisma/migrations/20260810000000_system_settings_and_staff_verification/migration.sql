-- Platform-wide switches controlled by the system admin. Singleton row.
-- Defaults reproduce the pre-existing behaviour exactly.
CREATE TABLE "SystemSettings" (
    "id" SERIAL NOT NULL,
    "require_registration_verification" BOOLEAN NOT NULL DEFAULT true,
    "require_staff_verification" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- Staff accounts need their own verification token when the staff toggle is on.
ALTER TABLE "User" ADD COLUMN "verification_token" VARCHAR(255);
ALTER TABLE "User" ADD COLUMN "verification_expires" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_verification_token_key" ON "User"("verification_token");
