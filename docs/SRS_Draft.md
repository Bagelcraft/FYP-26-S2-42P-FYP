# Software Requirements Specification — Smart Task Allocation
**FYP-26-S2-42P**

*Living document — update as features are built and clarified.*

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for the Smart Task Allocation platform — a SaaS application for organisations to manage staff and automate task allocation.

### 1.2 Scope
The system supports five user roles: System Admin, Organisation Admin, Project Manager, Permanent Worker, and Temporary Worker. An unregistered user can register a new organisation.

### 1.3 Definitions
| Term | Definition |
|------|------------|
| Organisation | A company or team using the platform |
| Task | A unit of work with a time window and optional skill requirement |
| Auto-Allocation | System-driven assignment of tasks to eligible workers |
| Availability | A time window declared by a worker as available or unavailable |

---

## 2. Overall Description

### 2.1 User Roles

| Role | Description |
|------|-------------|
| System Admin | Manages organisations and platform health |
| Organisation Admin | Manages staff, departments, and skill tags within their org |
| Project Manager | Creates tasks, allocates staff manually or via auto-allocation |
| Permanent Worker | Full-time staff; views tasks, sets availability, clocks in/out |
| Temporary Worker | Contract staff; same as permanent worker with profile setup flow |
| Unregistered User | Can register a new organisation via the public site |

---

## 3. Functional Requirements

*To be expanded by each team member per their SRS coverage area.*

### 3.1 System Admin
- UC-SA-01: View system health
- UC-SA-02: View all organisations
- UC-SA-03: Create organisation
- UC-SA-04: Suspend organisation

### 3.2 Organisation Admin
- UC-OA-01: Register permanent staff
- UC-OA-02: Register temporary staff
- UC-OA-03: Manage departments
- UC-OA-04: Manage skill tags
- UC-OA-05: Assign skills to users

### 3.3 Project Manager
- UC-PM-01: Create task
- UC-PM-02: Update task
- UC-PM-03: Delete task
- UC-PM-04: Manual task allocation
- UC-PM-05: Auto-allocate task
- UC-PM-06: View eligible staff
- UC-PM-07: View working hours report

### 3.4 Permanent Worker
- UC-PW-01: View assigned tasks
- UC-PW-02: Acknowledge task
- UC-PW-03: Update task progress
- UC-PW-04: Set availability
- UC-PW-05: Apply for leave
- UC-PW-06: Clock in / Clock out
- UC-PW-07: View attendance history

### 3.5 Temporary Worker
- UC-TW-01: Profile setup
- UC-TW-02: View assigned tasks
- UC-TW-03: Update task progress
- UC-TW-04: Set availability
- UC-TW-05: Clock in / Clock out

### 3.6 Unregistered User
- UC-UU-01: View public features and pricing
- UC-UU-02: Register organisation
- UC-UU-03: Choose subscription plan
- UC-UU-04: Submit enquiry

---

## 4. Non-Functional Requirements
- All API responses under 500ms for standard queries
- JWT tokens expire after 30 minutes
- Passwords hashed with bcrypt (salt rounds: 10)
- RBAC enforced on all protected routes
- Input validation on all API endpoints

---

*Last updated: 2026-05-12*
