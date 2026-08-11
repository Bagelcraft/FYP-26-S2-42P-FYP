-- Per-flow switches for the live DNS/MX deliverability check. Default true keeps
-- the existing behaviour; turning one off accepts domains with no mail server
-- (internal domains, a company domain still being set up).
ALTER TABLE "SystemSettings" ADD COLUMN "require_registration_domain_check" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SystemSettings" ADD COLUMN "require_staff_domain_check" BOOLEAN NOT NULL DEFAULT true;
