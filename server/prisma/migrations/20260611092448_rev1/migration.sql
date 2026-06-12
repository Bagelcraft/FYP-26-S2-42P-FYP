/*
  Warnings:

  - The primary key for the `planfeature` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `feature_text` on the `planfeature` table. All the data in the column will be lost.
  - You are about to drop the column `plan_feature_id` on the `planfeature` table. All the data in the column will be lost.
  - You are about to drop the column `plan_id` on the `subscription` table. All the data in the column will be lost.
  - You are about to drop the column `billing_period` on the `subscriptionplan` table. All the data in the column will be lost.
  - You are about to drop the column `cta_text` on the `subscriptionplan` table. All the data in the column will be lost.
  - You are about to drop the column `plan_name` on the `subscriptionplan` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `subscriptionplan` table. All the data in the column will be lost.
  - Added the required column `feature_id` to the `PlanFeature` table without a default value. This is not possible if the table is not empty.
  - Added the required column `feature_name` to the `PlanFeature` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `SubscriptionPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price_annual` to the `SubscriptionPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price_monthly` to the `SubscriptionPlan` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `subscription` DROP FOREIGN KEY `Subscription_plan_id_fkey`;

-- AlterTable
ALTER TABLE `planfeature` DROP PRIMARY KEY,
    DROP COLUMN `feature_text`,
    DROP COLUMN `plan_feature_id`,
    ADD COLUMN `feature_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `feature_name` VARCHAR(200) NOT NULL,
    ADD PRIMARY KEY (`feature_id`);

-- AlterTable
ALTER TABLE `subscription` DROP COLUMN `plan_id`,
    ADD COLUMN `amount` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `subscriptionplan` DROP COLUMN `billing_period`,
    DROP COLUMN `cta_text`,
    DROP COLUMN `plan_name`,
    DROP COLUMN `price`,
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `max_users` INTEGER NULL,
    ADD COLUMN `name` VARCHAR(100) NOT NULL,
    ADD COLUMN `price_annual` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `price_monthly` DECIMAL(10, 2) NOT NULL;

-- CreateTable
CREATE TABLE `TaskSkill` (
    `task_skill_id` INTEGER NOT NULL AUTO_INCREMENT,
    `task_id` INTEGER NOT NULL,
    `skill_id` INTEGER NOT NULL,

    UNIQUE INDEX `TaskSkill_task_id_skill_id_key`(`task_id`, `skill_id`),
    PRIMARY KEY (`task_skill_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskUpdateRequest` (
    `request_id` INTEGER NOT NULL AUTO_INCREMENT,
    `task_id` INTEGER NOT NULL,
    `requested_by` INTEGER NOT NULL,
    `message` TEXT NULL,
    `status` ENUM('PENDING', 'RESPONDED') NOT NULL DEFAULT 'PENDING',
    `response` TEXT NULL,
    `responded_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TaskSkill` ADD CONSTRAINT `TaskSkill_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `Task`(`task_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskSkill` ADD CONSTRAINT `TaskSkill_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `Skill`(`skill_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskUpdateRequest` ADD CONSTRAINT `TaskUpdateRequest_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `Task`(`task_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskUpdateRequest` ADD CONSTRAINT `TaskUpdateRequest_requested_by_fkey` FOREIGN KEY (`requested_by`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
