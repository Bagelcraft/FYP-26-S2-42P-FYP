-- CreateTable
CREATE TABLE `LandingContent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hero_title` VARCHAR(200) NULL,
    `hero_subtitle` TEXT NULL,
    `hero_image_url` VARCHAR(500) NULL,
    `video_title` VARCHAR(200) NULL,
    `video_subtitle` TEXT NULL,
    `video_url` VARCHAR(500) NULL,
    `plan_name` VARCHAR(100) NULL,
    `plan_price` VARCHAR(50) NULL,
    `plan_description` TEXT NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LandingFeature` (
    `feature_id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `icon_url` VARCHAR(500) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`feature_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LandingTestimonial` (
    `testimonial_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `company` VARCHAR(150) NULL,
    `rating` INTEGER NOT NULL DEFAULT 5,
    `review_text` TEXT NOT NULL,
    `profile_image` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`testimonial_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
