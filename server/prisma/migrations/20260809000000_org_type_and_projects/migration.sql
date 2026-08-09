-- Company type (project-based vs shift-based) + the Project / ProjectResource
-- entities that back the project-based task system.

-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('PROJECT', 'NON_PROJECT');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- AlterTable: existing organisations keep the shift-based behaviour they have today.
ALTER TABLE "Organisation" ADD COLUMN "org_type" "OrgType" NOT NULL DEFAULT 'NON_PROJECT';

-- AlterTable
ALTER TABLE "UnregisteredUser" ADD COLUMN "org_type" "OrgType" NOT NULL DEFAULT 'NON_PROJECT';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "project_id" INTEGER;

-- CreateTable
CREATE TABLE "Project" (
    "project_id" SERIAL NOT NULL,
    "organisation_id" INTEGER NOT NULL,
    "manager_id" INTEGER,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "ProjectResource" (
    "resource_id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectResource_pkey" PRIMARY KEY ("resource_id")
);

-- CreateIndex
CREATE INDEX "Project_organisation_id_idx" ON "Project"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectResource_project_id_user_id_key" ON "ProjectResource"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "Task_project_id_idx" ON "Task"("project_id");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("organisation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectResource" ADD CONSTRAINT "ProjectResource_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectResource" ADD CONSTRAINT "ProjectResource_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE SET NULL ON UPDATE CASCADE;
