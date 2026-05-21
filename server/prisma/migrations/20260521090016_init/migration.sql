/*
  Warnings:

  - The primary key for the `attendance` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `clockIn` on the `attendance` table. All the data in the column will be lost.
  - You are about to drop the column `clockOut` on the `attendance` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `attendance` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `attendance` table. All the data in the column will be lost.
  - You are about to drop the column `workingHours` on the `attendance` table. All the data in the column will be lost.
  - The primary key for the `availability` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `endDatetime` on the `availability` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `availability` table. All the data in the column will be lost.
  - You are about to drop the column `startDatetime` on the `availability` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `availability` table. All the data in the column will be lost.
  - The primary key for the `department` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `headUserId` on the `department` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `department` table. All the data in the column will be lost.
  - You are about to drop the column `organisationId` on the `department` table. All the data in the column will be lost.
  - The primary key for the `organisation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `organisation` table. All the data in the column will be lost.
  - The primary key for the `subscription` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `endDate` on the `subscription` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `subscription` table. All the data in the column will be lost.
  - You are about to drop the column `organisationId` on the `subscription` table. All the data in the column will be lost.
  - You are about to drop the column `planName` on the `subscription` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `subscription` table. All the data in the column will be lost.
  - The primary key for the `task` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdById` on the `task` table. All the data in the column will be lost.
  - You are about to drop the column `endDatetime` on the `task` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `task` table. All the data in the column will be lost.
  - You are about to drop the column `organisationId` on the `task` table. All the data in the column will be lost.
  - You are about to drop the column `requiredSkillId` on the `task` table. All the data in the column will be lost.
  - You are about to drop the column `startDatetime` on the `task` table. All the data in the column will be lost.
  - The primary key for the `taskassignment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `assignedAt` on the `taskassignment` table. All the data in the column will be lost.
  - You are about to drop the column `assignedById` on the `taskassignment` table. All the data in the column will be lost.
  - You are about to drop the column `assignedToId` on the `taskassignment` table. All the data in the column will be lost.
  - You are about to drop the column `assignmentType` on the `taskassignment` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `taskassignment` table. All the data in the column will be lost.
  - You are about to drop the column `taskId` on the `taskassignment` table. All the data in the column will be lost.
  - The primary key for the `user` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `fullName` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `user` table. All the data in the column will be lost.
  - The primary key for the `userskill` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `userskill` table. All the data in the column will be lost.
  - You are about to drop the column `skillId` on the `userskill` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `userskill` table. All the data in the column will be lost.
  - You are about to drop the `skilltag` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[active_subscription_id]` on the table `Organisation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `attendance_id` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clock_in` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `availability_id` to the `Availability` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_datetime` to the `Availability` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_datetime` to the `Availability` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `Availability` table without a default value. This is not possible if the table is not empty.
  - Added the required column `department_id` to the `Department` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organisation_id` to the `Department` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organisation_id` to the `Organisation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_date` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organisation_id` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plan_id` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_date` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subscription_id` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_datetime` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organisation_id` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_datetime` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `task_id` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assigned_by` to the `TaskAssignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assigned_to` to the `TaskAssignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assignment_id` to the `TaskAssignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assignment_type` to the `TaskAssignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `task_id` to the `TaskAssignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `full_name` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password_hash` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_type` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `skill_id` to the `UserSkill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `UserSkill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_skill_id` to the `UserSkill` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `attendance` DROP FOREIGN KEY `Attendance_userId_fkey`;

-- DropForeignKey
ALTER TABLE `availability` DROP FOREIGN KEY `Availability_userId_fkey`;

-- DropForeignKey
ALTER TABLE `department` DROP FOREIGN KEY `Department_organisationId_fkey`;

-- DropForeignKey
ALTER TABLE `notification` DROP FOREIGN KEY `Notification_recipientId_fkey`;

-- DropForeignKey
ALTER TABLE `skilltag` DROP FOREIGN KEY `SkillTag_organisationId_fkey`;

-- DropForeignKey
ALTER TABLE `subscription` DROP FOREIGN KEY `Subscription_organisationId_fkey`;

-- DropForeignKey
ALTER TABLE `task` DROP FOREIGN KEY `Task_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `task` DROP FOREIGN KEY `Task_requiredSkillId_fkey`;

-- DropForeignKey
ALTER TABLE `taskassignment` DROP FOREIGN KEY `TaskAssignment_assignedToId_fkey`;

-- DropForeignKey
ALTER TABLE `taskassignment` DROP FOREIGN KEY `TaskAssignment_taskId_fkey`;

-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_organisationId_fkey`;

-- DropForeignKey
ALTER TABLE `userskill` DROP FOREIGN KEY `UserSkill_skillId_fkey`;

-- DropForeignKey
ALTER TABLE `userskill` DROP FOREIGN KEY `UserSkill_userId_fkey`;

-- AlterTable
ALTER TABLE `attendance` DROP PRIMARY KEY,
    DROP COLUMN `clockIn`,
    DROP COLUMN `clockOut`,
    DROP COLUMN `id`,
    DROP COLUMN `userId`,
    DROP COLUMN `workingHours`,
    ADD COLUMN `attendance_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `clock_in` DATETIME(3) NOT NULL,
    ADD COLUMN `clock_out` DATETIME(3) NULL,
    ADD COLUMN `user_id` INTEGER NOT NULL,
    ADD COLUMN `working_hours` DECIMAL(5, 2) NULL,
    ADD PRIMARY KEY (`attendance_id`);

-- AlterTable
ALTER TABLE `availability` DROP PRIMARY KEY,
    DROP COLUMN `endDatetime`,
    DROP COLUMN `id`,
    DROP COLUMN `startDatetime`,
    DROP COLUMN `userId`,
    ADD COLUMN `availability_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `end_datetime` DATETIME(3) NOT NULL,
    ADD COLUMN `start_datetime` DATETIME(3) NOT NULL,
    ADD COLUMN `user_id` INTEGER NOT NULL,
    ADD PRIMARY KEY (`availability_id`);

-- AlterTable
ALTER TABLE `department` DROP PRIMARY KEY,
    DROP COLUMN `headUserId`,
    DROP COLUMN `id`,
    DROP COLUMN `organisationId`,
    ADD COLUMN `department_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `head_user_id` INTEGER NULL,
    ADD COLUMN `organisation_id` INTEGER NOT NULL,
    ADD PRIMARY KEY (`department_id`);

-- AlterTable
ALTER TABLE `notification` MODIFY `message` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `organisation` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `active_subscription_id` INTEGER NULL,
    ADD COLUMN `organisation_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`organisation_id`);

-- AlterTable
ALTER TABLE `subscription` DROP PRIMARY KEY,
    DROP COLUMN `endDate`,
    DROP COLUMN `id`,
    DROP COLUMN `organisationId`,
    DROP COLUMN `planName`,
    DROP COLUMN `startDate`,
    ADD COLUMN `end_date` DATE NOT NULL,
    ADD COLUMN `organisation_id` INTEGER NOT NULL,
    ADD COLUMN `plan_id` INTEGER NOT NULL,
    ADD COLUMN `start_date` DATE NOT NULL,
    ADD COLUMN `subscription_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`subscription_id`);

-- AlterTable
ALTER TABLE `task` DROP PRIMARY KEY,
    DROP COLUMN `createdById`,
    DROP COLUMN `endDatetime`,
    DROP COLUMN `id`,
    DROP COLUMN `organisationId`,
    DROP COLUMN `requiredSkillId`,
    DROP COLUMN `startDatetime`,
    ADD COLUMN `created_by` INTEGER NOT NULL,
    ADD COLUMN `department_id` INTEGER NULL,
    ADD COLUMN `end_datetime` DATETIME(3) NOT NULL,
    ADD COLUMN `organisation_id` INTEGER NOT NULL,
    ADD COLUMN `required_skill_id` INTEGER NULL,
    ADD COLUMN `start_datetime` DATETIME(3) NOT NULL,
    ADD COLUMN `task_id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `description` TEXT NULL,
    ADD PRIMARY KEY (`task_id`);

-- AlterTable
ALTER TABLE `taskassignment` DROP PRIMARY KEY,
    DROP COLUMN `assignedAt`,
    DROP COLUMN `assignedById`,
    DROP COLUMN `assignedToId`,
    DROP COLUMN `assignmentType`,
    DROP COLUMN `id`,
    DROP COLUMN `taskId`,
    ADD COLUMN `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `assigned_by` INTEGER NOT NULL,
    ADD COLUMN `assigned_to` INTEGER NOT NULL,
    ADD COLUMN `assignment_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `assignment_type` ENUM('MANUAL', 'AUTO') NOT NULL,
    ADD COLUMN `task_id` INTEGER NOT NULL,
    ADD PRIMARY KEY (`assignment_id`);

-- AlterTable
ALTER TABLE `user` DROP PRIMARY KEY,
    DROP COLUMN `fullName`,
    DROP COLUMN `id`,
    DROP COLUMN `isActive`,
    DROP COLUMN `passwordHash`,
    DROP COLUMN `role`,
    ADD COLUMN `full_name` VARCHAR(100) NOT NULL,
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `password_hash` VARCHAR(255) NOT NULL,
    ADD COLUMN `role_id` INTEGER NULL,
    ADD COLUMN `userId` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `user_type` ENUM('SYSTEM_ADMIN', 'ORG_ADMIN', 'PROJECT_MANAGER', 'PERMANENT_WORKER', 'TEMPORARY_WORKER') NOT NULL,
    ADD PRIMARY KEY (`userId`);

-- AlterTable
ALTER TABLE `userskill` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    DROP COLUMN `skillId`,
    DROP COLUMN `userId`,
    ADD COLUMN `certification_url` VARCHAR(500) NULL,
    ADD COLUMN `skill_id` INTEGER NOT NULL,
    ADD COLUMN `user_id` INTEGER NOT NULL,
    ADD COLUMN `user_skill_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`user_skill_id`);

-- DropTable
DROP TABLE `skilltag`;

-- CreateTable
CREATE TABLE `SubscriptionPlan` (
    `plan_id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_name` VARCHAR(100) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `billing_period` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `cta_text` VARCHAR(100) NULL,

    PRIMARY KEY (`plan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanFeature` (
    `plan_feature_id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_id` INTEGER NOT NULL,
    `feature_text` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`plan_feature_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BillingRecord` (
    `billing_id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscription_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `billing_date` DATE NOT NULL,
    `receipt_url` VARCHAR(500) NULL,
    `status` ENUM('PAID', 'UNPAID', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',

    PRIMARY KEY (`billing_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffRole` (
    `role_id` INTEGER NOT NULL AUTO_INCREMENT,
    `organisation_id` INTEGER NOT NULL,
    `role_name` VARCHAR(100) NOT NULL,
    `max_working_hours` INTEGER NULL,

    PRIMARY KEY (`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Skill` (
    `skill_id` INTEGER NOT NULL AUTO_INCREMENT,
    `organisation_id` INTEGER NOT NULL,
    `skill_name` VARCHAR(100) NOT NULL,
    `cert_required` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`skill_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeaveRequest` (
    `leave_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `approved_by` INTEGER NULL,
    `leave_type` ENUM('ANNUAL', 'MEDICAL', 'UNPAID', 'OTHER') NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',

    PRIMARY KEY (`leave_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeaveBalance` (
    `balance_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `leave_type` ENUM('ANNUAL', 'MEDICAL', 'UNPAID', 'OTHER') NOT NULL,
    `entitled_days` INTEGER NOT NULL,
    `used_days` INTEGER NOT NULL DEFAULT 0,
    `year` INTEGER NOT NULL,

    PRIMARY KEY (`balance_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AllocationHistory` (
    `history_id` INTEGER NOT NULL AUTO_INCREMENT,
    `task_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `changed_by` INTEGER NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`history_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShiftChangeRequest` (
    `request_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `reviewed_by` INTEGER NULL,
    `original_shift` DATETIME(3) NOT NULL,
    `requested_shift` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UnregisteredUser` (
    `marketing_user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `organisation_id` INTEGER NULL,
    `email` VARCHAR(150) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NULL,
    `company_name` VARCHAR(150) NULL,
    `position` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`marketing_user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactEnquiry` (
    `enquiry_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `subject` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`enquiry_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Testimonial` (
    `testimonial_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `rating` INTEGER NOT NULL,
    `review_text` TEXT NOT NULL,
    `profile_image` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`testimonial_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Feedback` (
    `feedback_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `message` TEXT NOT NULL,
    `status` ENUM('OPEN', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`feedback_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Organisation_active_subscription_id_key` ON `Organisation`(`active_subscription_id`);

-- AddForeignKey
ALTER TABLE `PlanFeature` ADD CONSTRAINT `PlanFeature_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `SubscriptionPlan`(`plan_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Organisation` ADD CONSTRAINT `Organisation_active_subscription_id_fkey` FOREIGN KEY (`active_subscription_id`) REFERENCES `Subscription`(`subscription_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_organisation_id_fkey` FOREIGN KEY (`organisation_id`) REFERENCES `Organisation`(`organisation_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `SubscriptionPlan`(`plan_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillingRecord` ADD CONSTRAINT `BillingRecord_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `Subscription`(`subscription_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffRole` ADD CONSTRAINT `StaffRole_organisation_id_fkey` FOREIGN KEY (`organisation_id`) REFERENCES `Organisation`(`organisation_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `Organisation`(`organisation_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `StaffRole`(`role_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `Department_organisation_id_fkey` FOREIGN KEY (`organisation_id`) REFERENCES `Organisation`(`organisation_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `Department_head_user_id_fkey` FOREIGN KEY (`head_user_id`) REFERENCES `User`(`userId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Skill` ADD CONSTRAINT `Skill_organisation_id_fkey` FOREIGN KEY (`organisation_id`) REFERENCES `Organisation`(`organisation_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSkill` ADD CONSTRAINT `UserSkill_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSkill` ADD CONSTRAINT `UserSkill_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `Skill`(`skill_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Availability` ADD CONSTRAINT `Availability_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `User`(`userId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveBalance` ADD CONSTRAINT `LeaveBalance_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_organisation_id_fkey` FOREIGN KEY (`organisation_id`) REFERENCES `Organisation`(`organisation_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `Department`(`department_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_required_skill_id_fkey` FOREIGN KEY (`required_skill_id`) REFERENCES `Skill`(`skill_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAssignment` ADD CONSTRAINT `TaskAssignment_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `Task`(`task_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAssignment` ADD CONSTRAINT `TaskAssignment_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAssignment` ADD CONSTRAINT `TaskAssignment_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AllocationHistory` ADD CONSTRAINT `AllocationHistory_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `Task`(`task_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AllocationHistory` ADD CONSTRAINT `AllocationHistory_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AllocationHistory` ADD CONSTRAINT `AllocationHistory_changed_by_fkey` FOREIGN KEY (`changed_by`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShiftChangeRequest` ADD CONSTRAINT `ShiftChangeRequest_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShiftChangeRequest` ADD CONSTRAINT `ShiftChangeRequest_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `User`(`userId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UnregisteredUser` ADD CONSTRAINT `UnregisteredUser_organisation_id_fkey` FOREIGN KEY (`organisation_id`) REFERENCES `Organisation`(`organisation_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Testimonial` ADD CONSTRAINT `Testimonial_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Feedback` ADD CONSTRAINT `Feedback_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
