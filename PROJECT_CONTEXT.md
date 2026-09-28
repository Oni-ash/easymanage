# PROJECT_CONTEXT.md

This file provides context to AI coding assistants working on the EasyManage project.

## 1. Project Overview
- **Name:** EasyManage
- **Purpose:** A college management application for students, faculty, and HODs to manage attendance, leaves, materials, notices, and more.
- **Specification:** The full feature set and requirements are detailed in the original PDF document.

## 2. Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI Library:** Material UI v6 (Material Design 3)
- **Database:** PostgreSQL
- **ORM:** Prisma 6
- **Authentication:** Auth.js v5 (Credentials provider)

## 3. Key Architectural Decisions & Rules
- **Authentication & Authorization:**
    - The user's role (`STUDENT`, `FACULTY`, `HOD`, `ADMIN`) is stored in the `User` model.
    - Granular permissions (e.g., `GRIEVANCE`, `FEE`) are stored as an array on the `User`.
    - **Crucial Rule:** All database queries that fetch data for a list or view must be scoped based on the requesting user's principal. The `src/lib/principal.ts` and `src/lib/sections.ts` files are the single source of truth for this logic.
    - The `proxy.ts` file handles route protection. Do not modify its logic without understanding the implications.
- **Database Schema:**
    - The entire schema is defined in `prisma/schema.prisma`.
    - **Never** edit the database schema directly in the database. Always edit `schema.prisma` and run a migration.
    - The schema is designed to support all features from the specification. Refer to the models (e.g., `AttendanceSession`, `LeaveRequest`, `Grievance`) for details.
- **Code Structure:**
    - **Route Groups:** The `src/app/(app)/` folder contains all authenticated pages that share the main application shell. The `src/app/(auth)/` folder would contain login-related pages.
    - **Server Components:** Data fetching happens in Server Components (`src/app/(app)/<section>/page.tsx`).
    - **Client Components:** Interactive elements (forms, buttons) are Client Components (e.g., `src/app/(app)/shell.tsx`).
    - **Shared Logic:** Utility functions and types are in `src/lib/`.

## 4. How to Work (Guidelines for AI)
1.  **Read the Spec:** Before starting any new feature, read the relevant section of the original specification PDF.
2.  **Check the Schema:** Understand which Prisma models are involved for the feature.
3.  **Build the Data Layer First:** If a feature needs new data, add the required models to `prisma/schema.prisma` and run a migration.
4.  **Implement RBAC:** In the `page.tsx` for a feature, use the `getPrincipal()` function from `src/lib/principal.ts` to get the current user's context. Use this context to filter the data you pass to the component.
5.  **Follow the UI Pattern:** Each feature page should import a `Placeholder` component (or a real UI) and follow the structure defined in `src/app/(app)/layout.tsx`.
6.  **Never Hardcode Permissions:** Do not write conditions like `if (user.role === 'HOD')` inside a component. Instead, rely on the `visible` function in `src/lib/sections.ts` and the data-scoping logic in your server-side queries.

## 5. Setup Instructions
1.  Clone the repository.
2.  Run `npm install`.
3.  Copy `.env.example` to `.env` and fill in the `DATABASE_URL` and `AUTH_SECRET`. (You may need to create the `.env.example` file first).
4.  Run `npx prisma migrate dev` to set up the database.
5.  Run `npx prisma db seed` to populate the database with test data.
6.  Run `npm run dev` to start the development server.

## 6. Current State (as of [Date])
- **Completed:**
    - Project setup (Next.js, MUI, Prisma, Auth.js).
    - Full database schema migration.
    - Seed script for initial data.
    - Working authentication and login system.
    - Role-aware application shell (sidebar, app bar).
- **In Progress:** Attendance feature.
- **Next:** Leave requisition system.