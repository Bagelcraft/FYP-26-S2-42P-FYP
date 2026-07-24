-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('SYSTEM_ADMIN', 'ORG_ADMIN', 'PROJECT_MANAGER', 'PERMANENT_WORKER', 'TEMPORARY_WORKER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'MEDICAL', 'UNPAID', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PAID', 'UNPAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ShiftChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UpdateRequestStatus" AS ENUM ('PENDING', 'RESPONDED');

-- CreateTable
CREATE TABLE "Organisation" (
    "organisation_id" SERIAL NOT NULL,
    "active_subscription_id" INTEGER,
    "name" VARCHAR(150) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("organisation_id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "subscription_id" SERIAL NOT NULL,
    "organisation_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("subscription_id")
);

-- CreateTable
CREATE TABLE "BillingRecord" (
    "billing_id" SERIAL NOT NULL,
    "subscription_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "billing_date" DATE NOT NULL,
    "receipt_url" VARCHAR(500),
    "status" "BillingStatus" NOT NULL DEFAULT 'UNPAID',

    CONSTRAINT "BillingRecord_pkey" PRIMARY KEY ("billing_id")
);

-- CreateTable
CREATE TABLE "StaffRole" (
    "role_id" SERIAL NOT NULL,
    "organisation_id" INTEGER NOT NULL,
    "department_id" INTEGER,
    "role_name" VARCHAR(100) NOT NULL,
    "max_working_hours" INTEGER,

    CONSTRAINT "StaffRole_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "RoleSkill" (
    "role_skill_id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,

    CONSTRAINT "RoleSkill_pkey" PRIMARY KEY ("role_skill_id")
);

-- CreateTable
CREATE TABLE "User" (
    "userId" SERIAL NOT NULL,
    "organisationId" INTEGER,
    "role_id" INTEGER,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "user_type" "UserType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Department" (
    "department_id" SERIAL NOT NULL,
    "organisation_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("department_id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "skill_id" SERIAL NOT NULL,
    "organisation_id" INTEGER NOT NULL,
    "skill_name" VARCHAR(100) NOT NULL,
    "cert_required" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("skill_id")
);

-- CreateTable
CREATE TABLE "UserSkill" (
    "user_skill_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "certification_url" VARCHAR(500),

    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("user_skill_id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "attendance_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "clock_in" TIMESTAMP(3) NOT NULL,
    "clock_out" TIMESTAMP(3),
    "working_hours" DECIMAL(5,2),

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("attendance_id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "availability_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "start_datetime" TIMESTAMP(3) NOT NULL,
    "end_datetime" TIMESTAMP(3) NOT NULL,
    "status" "AvailabilityStatus" NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("availability_id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "leave_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "approved_by" INTEGER,
    "leave_type" "LeaveType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("leave_id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "balance_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "leave_type" "LeaveType" NOT NULL,
    "entitled_days" INTEGER NOT NULL,
    "used_days" INTEGER NOT NULL DEFAULT 0,
    "year" INTEGER NOT NULL,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("balance_id")
);

-- CreateTable
CREATE TABLE "Task" (
    "task_id" SERIAL NOT NULL,
    "organisation_id" INTEGER NOT NULL,
    "department_id" INTEGER,
    "created_by" INTEGER NOT NULL,
    "required_skill_id" INTEGER,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "start_datetime" TIMESTAMP(3) NOT NULL,
    "end_datetime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("task_id")
);

-- CreateTable
CREATE TABLE "TaskSkill" (
    "task_skill_id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,

    CONSTRAINT "TaskSkill_pkey" PRIMARY KEY ("task_skill_id")
);

-- CreateTable
CREATE TABLE "TaskAssignment" (
    "assignment_id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "assigned_to" INTEGER NOT NULL,
    "assigned_by" INTEGER NOT NULL,
    "assignment_type" "AssignmentType" NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAssignment_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateTable
CREATE TABLE "AllocationHistory" (
    "history_id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "changed_by" INTEGER NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllocationHistory_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "TaskUpdateRequest" (
    "request_id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "requested_by" INTEGER NOT NULL,
    "message" TEXT,
    "status" "UpdateRequestStatus" NOT NULL DEFAULT 'PENDING',
    "response" TEXT,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskUpdateRequest_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "ShiftTemplate" (
    "shift_id" SERIAL NOT NULL,
    "organisation_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftTemplate_pkey" PRIMARY KEY ("shift_id")
);

-- CreateTable
CREATE TABLE "ShiftAssignment" (
    "assignment_id" SERIAL NOT NULL,
    "organisation_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "shift_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateTable
CREATE TABLE "ShiftChangeRequest" (
    "request_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "reviewed_by" INTEGER,
    "original_shift" TIMESTAMP(3) NOT NULL,
    "requested_shift" TIMESTAMP(3) NOT NULL,
    "status" "ShiftChangeStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftChangeRequest_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "UnregisteredUser" (
    "marketing_user_id" SERIAL NOT NULL,
    "organisation_id" INTEGER,
    "full_name" VARCHAR(150),
    "email" VARCHAR(150) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50),
    "company_name" VARCHAR(150),
    "position" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnregisteredUser_pkey" PRIMARY KEY ("marketing_user_id")
);

-- CreateTable
CREATE TABLE "ContactEnquiry" (
    "enquiry_id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "name" VARCHAR(100),
    "email" VARCHAR(150),
    "subject" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "response_message" TEXT,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactEnquiry_pkey" PRIMARY KEY ("enquiry_id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "testimonial_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "review_text" TEXT NOT NULL,
    "profile_image" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("testimonial_id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "feedback_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("feedback_id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingContent" (
    "id" SERIAL NOT NULL,
    "hero_title" VARCHAR(200) NOT NULL,
    "hero_subtitle" TEXT,
    "hero_image_url" VARCHAR(500),
    "video_title" VARCHAR(200),
    "video_subtitle" TEXT,
    "video_url" VARCHAR(500),
    "plan_name" VARCHAR(100),
    "plan_price" VARCHAR(50),
    "plan_description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingFeature" (
    "feature_id" SERIAL NOT NULL,
    "icon" VARCHAR(10),
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingFeature_pkey" PRIMARY KEY ("feature_id")
);

-- CreateTable
CREATE TABLE "LandingTestimonial" (
    "testimonial_id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "company" VARCHAR(150),
    "rating" INTEGER NOT NULL DEFAULT 5,
    "review_text" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingTestimonial_pkey" PRIMARY KEY ("testimonial_id")
);

-- CreateTable
CREATE TABLE "ProfileChangeRequest" (
    "request_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "field" VARCHAR(100) NOT NULL,
    "requested_value" TEXT NOT NULL,
    "reason" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "reviewed_by" INTEGER,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileChangeRequest_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "plan_id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "price_monthly" DECIMAL(10,2) NOT NULL,
    "price_annual" DECIMAL(10,2) NOT NULL,
    "max_users" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("plan_id")
);

-- CreateTable
CREATE TABLE "PlanFeature" (
    "feature_id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "feature_name" VARCHAR(200) NOT NULL,

    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("feature_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_active_subscription_id_key" ON "Organisation"("active_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "RoleSkill_role_id_skill_id_key" ON "RoleSkill"("role_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TaskSkill_task_id_skill_id_key" ON "TaskSkill"("task_id", "skill_id");

-- AddForeignKey
ALTER TABLE "Organisation" ADD CONSTRAINT "Organisation_active_subscription_id_fkey" FOREIGN KEY ("active_subscription_id") REFERENCES "Subscription"("subscription_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("organisation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("subscription_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRole" ADD CONSTRAINT "StaffRole_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("organisation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRole" ADD CONSTRAINT "StaffRole_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleSkill" ADD CONSTRAINT "RoleSkill_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "StaffRole"("role_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleSkill" ADD CONSTRAINT "RoleSkill_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "Skill"("skill_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("organisation_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "StaffRole"("role_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("organisation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("organisation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "Skill"("skill_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("organisation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_required_skill_id_fkey" FOREIGN KEY ("required_skill_id") REFERENCES "Skill"("skill_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSkill" ADD CONSTRAINT "TaskSkill_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSkill" ADD CONSTRAINT "TaskSkill_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "Skill"("skill_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("task_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationHistory" ADD CONSTRAINT "AllocationHistory_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("task_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationHistory" ADD CONSTRAINT "AllocationHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationHistory" ADD CONSTRAINT "AllocationHistory_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskUpdateRequest" ADD CONSTRAINT "TaskUpdateRequest_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("task_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskUpdateRequest" ADD CONSTRAINT "TaskUpdateRequest_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTemplate" ADD CONSTRAINT "ShiftTemplate_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("organisation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("organisation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "ShiftTemplate"("shift_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftChangeRequest" ADD CONSTRAINT "ShiftChangeRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftChangeRequest" ADD CONSTRAINT "ShiftChangeRequest_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnregisteredUser" ADD CONSTRAINT "UnregisteredUser_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("organisation_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileChangeRequest" ADD CONSTRAINT "ProfileChangeRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileChangeRequest" ADD CONSTRAINT "ProfileChangeRequest_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "SubscriptionPlan"("plan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

