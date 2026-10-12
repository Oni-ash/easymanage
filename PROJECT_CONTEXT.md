# PROJECT_CONTEXT.md

Reference document for AI coding assistants and human contributors working on EasyManage. Read this before writing any code.

---

## 1. Project overview

**EasyManage** is a college management web app for students, faculty, HODs, and administrative staff. It handles attendance, leave requests, materials, notices, fees, and eventually the full spec covered in the original planning PDF.

- **Target users:** one college, multiple departments, hundreds of students, dozens of faculty
- **Deployment target:** initially self-hosted / Vercel; later, full college-wide deployment with object storage (S3/R2) and managed Postgres
- **Status:** active development. Five of eleven spec features complete as of 2026-10-12.

---

## 2. Tech stack (exact versions)

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.3.6 |
| Language | TypeScript | 5.9.x |
| UI | MUI (Material Design 3) | 9.4.0 |
| Icons | @mui/icons-material | 9.4.0 |
| Database | PostgreSQL | 18 |
| ORM | Prisma | 6.16.1 |
| Auth | Auth.js (next-auth) | 5.0.0-beta.32 |
| Password hashing | bcryptjs | 2.4.3 |
| Runtime scripts | tsx | 4.19.2 |

**Version policy:** all versions are pinned. Do not run `npm install <pkg>@latest`. If upgrading, upgrade the whole stack coherently and test.

**Notable exception:** `next-auth` is on a **beta** version because v5 is the only version compatible with the Next.js App Router. Pin it exactly.

---

## 3. Roles and permissions

### Roles (`Role` enum)

| Role | Purpose |
|---|---|
| `STUDENT` | Belongs to one class, one department. Sees own data. |
| `FACULTY` | Teaches subjects to classes. May be class incharge. |
| `HOD` | Head of a department. Sees all department data. |
| `ACCOUNTS` | Fees section staff. College-wide, no department. |
| `ADMIN` | Full system access. Manages users and roles. |

### Permissions (`Permission[]` array on User)

Granted individually on top of role. Only used by FACULTY currently.

| Permission | Grants |
|---|---|
| `GRIEVANCE` | Access to the grievance section |
| `FEE` | Access to fee records (faculty only) |
| `CALENDAR_EDIT` | Can edit the academic calendar |
| `RESULTS_PUBLISH` | Can publish exam results |

**Adding a new permission:** add to the `Permission` enum in `schema.prisma`, migrate, then gate the relevant section in `src/lib/sections.ts`.

---

## 4. Architecture and conventions

### Route groups
src/app/
├── (app)/ ← authenticated app with shared shell layout
│ ├── layout.tsx ← checks getPrincipal(), renders Shell
│ ├── shell.tsx ← AppBar + Drawer (client component)
│ └── <section>/ ← one folder per feature
├── api/ ← route handlers (bypass proxy.ts, must check auth manually)
├── login/ ← login/signup page
└── page.tsx ← landing page

The `(app)` folder uses **parentheses** — this is a Next.js *route group*. It does not appear in URLs. `(app)/dashboard/page.tsx` resolves to `/dashboard`.

### Section registration

Every feature's sidebar entry is registered in **one place**: `src/lib/sections.ts`. Do not add nav items anywhere else. The `visible` function on each Section determines who sees it.

```ts
{
  key: 'attendance',
  label: 'Attendance',
  href: '/attendance',
  visible: (p) => isStudent(p) || isFaculty(p) || isHod(p) || isAdmin(p),
}
To add a new section: add its SectionKey, add it to SECTIONS, create the page under (app)/<key>/page.tsx
Role-router page pattern

Every feature's main page uses this shape:
tsx

// src/app/(app)/<section>/page.tsx
import { getPrincipal } from '@/lib/principal';
import StudentView from './student-view';
import FacultyView from './faculty-view';
import HodView from './hod-view';

export default async function SectionPage() {
  const principal = await getPrincipal();
  if (!principal) return null;
  if (principal.role === 'STUDENT') return <StudentView principal={principal} />;
  if (principal.role === 'HOD' || principal.role === 'ADMIN') return <HodView principal={principal} />;
  return <FacultyView principal={principal} />;
}

Each view is a server component that queries the database directly with prisma
getPrincipal() — the only way to know who's calling
ts

import { getPrincipal } from '@/lib/principal';
const principal = await getPrincipal();

    Returns a fully-typed Principal | null

    Wrapped in React cache() — safe to call in every component on a page, only queries once per request

    Always returns live data (fresh DB read), not stale JWT claims

    Never trust the JWT alone. If a user's role changes, only a DB read catches it.
Server action pattern
ts

// src/app/(app)/<section>/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

export async function doThing(input: string): Promise<{ ok: true } | { error: string }> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };

  // 1. Authorization check — reject early
  if (!canDoThing(principal)) return { error: 'Not authorized' };

  // 2. Validation
  if (!input || input.length < 3) return { error: 'Invalid input' };

  // 3. Mutation inside a transaction if multiple writes
  await prisma.$transaction(async (tx) => {
    await tx.thing.create({ data: { /* ... */ } });
    await tx.auditLog.create({ data: { /* ... */ } });
    await tx.notification.create({ data: { /* ... */ } });
  });

  // 4. Revalidate affected pages
  revalidatePath('/things');
  return { ok: true };
}

API route naming

Pattern: /api/<singular-noun>/[id]/<verb>

    ✅ /api/material/[materialId]/download

    ❌ /api/materials/[id]/download (plural — causes slug-name conflicts with the (app)/materials/[subjectId] tree)

Reason: Next.js 16 errors if two different dynamic segments live under the same literal parent path across app/ and app/api/. Using a different literal in the API path avoids this.
LinkButton wrapper

MUI's <Button component={Link}> cannot be used directly in a server component (passing a function prop across the RSC boundary errors). Use the local LinkButton wrapper:
tsx

// In any folder, create link-button.tsx:
'use client';
import Link from 'next/link';
import { Button, type ButtonProps } from '@mui/material';
type Props = Omit<ButtonProps, 'component' | 'href'> & { href: string };
export default function LinkButton({ href, ...rest }: Props) {
  return <Button component={Link} href={href} {...rest} />;
}

Known tech debt: this file is currently duplicated in attendance/, leave/, materials/, notices/. Future cleanup: move to src/components/link-button.tsx and update imports.
Date formatting

Use src/lib/dates.ts:
ts

import { formatDate, formatDateTime } from '@/lib/dates';
formatDate(date);       // "2026-10-12"
formatDateTime(date);   // "2026-10-12 15:30"

Do not inline .toISOString().slice(0, 10).
5. Database
Schema location

prisma/schema.prisma — single source of truth for all tables, enums, and relations.
Migrations
powershell

npx prisma migrate dev --name <descriptive_name>

Never edit the DB directly. Always edit schema.prisma and migrate.

Windows gotcha: stop the npm run dev server before running prisma generate or prisma migrate dev. Otherwise you'll get EPERM: operation not permitted, rename query_engine-windows.dll.node — Windows won't let Prisma overwrite a DLL that Next.js has loaded.
Seeding
powershell

npx prisma migrate reset

Confirm y. This drops the DB, re-runs all migrations, and runs prisma/seed.ts. The seed is idempotent (clears all tables first), so it's safe to run repeatedly.

Known issue: the seed uses deleteMany + create, which regenerates user IDs every reset. Your JWT cookies reference the old IDs, causing a redirect loop on next page load. Fix: clear cookies in DevTools (F12 → Application → Cookies → delete authjs.session-token). Planned fix: make seed use upsert with fixed IDs.
Postgres raw SQL gotcha

Prisma creates tables and columns with camelCase names, which Postgres treats as case-sensitive. In raw SQL, always quote them:
sql

SELECT * FROM "User" WHERE "classId" = '...';

Forgetting the quotes → relation "user" does not exist.

PowerShell quoting is painful. For non-trivial queries, save to a .sql file and run psql -U postgres -d easymanage -f query.sql. Or use Prisma Studio (npx prisma studio) for quick inspections.
6. Authentication and authorization
Auth flow

    Provider: Credentials (username or email + password)

    Session strategy: JWT (stateless, cookie-based)

    Verification: bcryptjs, 10 rounds

    Config: src/auth.ts

    Route handler: src/app/api/auth/[...nextauth]/route.ts

Route protection

src/proxy.ts (Next.js 16 renamed middleware.ts → proxy.ts):

    Redirects unauthenticated users to /login

    /login, /, /api/auth/*, /test-db are public

    Does not redirect logged-in users away from /login — this was removed deliberately to prevent redirect loops when JWTs reference deleted users

API routes and proxy.ts

The proxy's matcher excludes /api/*. Every API route must call auth() or getPrincipal() itself. Do not assume proxy.ts protects API routes.
Authorization rules

Every server action and API route must:

    Call getPrincipal() first

    Check the principal is not null

    Check the principal's role/permission for the specific action

    Scope the DB query to what the principal can see

    Return { error: string } (not throw) for policy rejections

Fail-closed, not fail-open. If a scope variable is null or missing, filter by a sentinel that matches nothing — never skip the filter.

Example from src/lib/rbac.ts:
ts

export function classScope(p: Principal): Record<string, unknown> {
  if (isAdmin(p)) return {};
  if (isHod(p)) return { departmentId: p.departmentId ?? '__none__' };  // fail-closed
  if (isStudent(p)) return { id: p.classId ?? '__none__' };
  return { OR: [{ inchargeId: p.id }, { teaching: { some: { facultyId: p.id } } }] };
}

7. File storage

Local development: files are stored in ./uploads/ at the project root. The folder is gitignored.

Abstraction: all file operations go through src/lib/storage.ts:
ts

import { saveFile, readStoredFile, deleteStoredFile } from '@/lib/storage';
const { key, size } = await saveFile(originalName, buffer);
const buffer = await readStoredFile(key);
await deleteStoredFile(key);

Migration path to production: when moving to S3 / Cloudflare R2, replace the bodies of these three functions with S3 SDK calls. No other file in the app should reference the filesystem directly.

File size limit: 20 MB per upload, enforced in server actions and via next.config.ts (serverActions.bodySizeLimit: '20mb').

Orphan cleanup: if a DB write fails after a file save, the action rolls back by calling deleteStoredFile(key). Follow this pattern for any new file-writing code.
8. Development workflow
First-time setup

    npm install

    Copy .env.example to .env, fill in DATABASE_URL and AUTH_SECRET

    npx prisma migrate reset (creates schema, seeds data)

    npm run dev

Daily workflow
powershell

# Stop dev server if running (Ctrl+C)
npx prisma migrate dev --name <change_name>   # if schema changed
npx prisma migrate reset                        # if seed changed
npm run dev

Environment variables (.env)

    DATABASE_URL — Postgres connection string

    AUTH_SECRET — random 32-byte base64 string

.env is gitignored. Never commit it. Use .env.example as a template.
Git workflow

    master is the source of truth

    Feature branches merge into master via fast-forward or clean merge

    Always check git status before git add . — ensure .env is not being added

    Commits are one feature per commit with a descriptive message

Working with external contributors

Contributors fork the repo and open PRs from their forks. To review:
powershell

git remote add <name> https://github.com/<username>/easymanage.git
git fetch <name>
git checkout -b review-<feature> <name>/<branch>
npx prisma migrate dev
npm run dev

After review, cherry-pick onto master:
powershell

git checkout master
git checkout -b merge-<feature>
git cherry-pick <sha1> <sha2>
# test again, then merge to master

9. Patterns to follow when adding a feature

Use this checklist for any new spec section:

    Schema. Add any new models to schema.prisma. Add missing relations on both sides. Migrate.

    Seed. Add representative demo data to prisma/seed.ts — enough to test every role's view. Reset.

    Section registration. Add to src/lib/sections.ts with the correct visible predicate.

    Role router page. (app)/<section>/page.tsx — reads getPrincipal(), renders a role-specific view.

    Views. <section>/student-view.tsx, faculty-view.tsx, hod-view.tsx — server components, direct Prisma queries, scoped by principal.

    Detail pages. Where the spec calls for drill-down, use nested [id] folders.

    Actions. <section>/actions.ts — server actions with the authorization + validation + transaction pattern.

    Notifications. Create Notification rows when the spec asks for a state-change alert (leave approval, material upload, fee payment, etc.).

    Audit logging. Create an AuditLog row for any sensitive write (fee changes, role changes, mark edits).

    Test all roles. Sign in as each seeded account and verify the happy path plus at least one error case.

10. Current state (2026-10-12)
Complete
Feature	Notes
Auth + shell	Credentials login, JWT sessions, sidebar, mobile drawer, avatar menu
Attendance	Student (%), faculty marking, HOD department + class + student drill-down
Leave requisition	Student submit, incharge approve→forward, HOD final approve/reject, notifications
Notice board	Scope filtering (college/dept/semester/class), staff posting, delete rules, notifications
Materials	Subject list, upload/download/delete, storage abstraction, notifications
Fees	ACCOUNTS role, permission gate, audit logging, transaction-safe writes, notifications
Pending (spec features)
Feature	Complexity
Weekly schedule	Easy — read-only CRUD, HOD editing, conflict detection
Academic calendar	Easy — calendar UI, HOD can add events
Grievance	Easy — one-way submission + staff response
Appointments	Medium — request/approve flow with time slots
Exam results	Hard — draft/publish flow, mark revisions, HOD approval
Pending (additions beyond original spec)

    Faculty leave requests (faculty → HOD, no incharge step)

    Report templates with PDF export

    Admin user management UI

    HOD review of faculty weekly schedules

Known tech debt

    LinkButton duplicated in four folders — consolidate to src/components/

    Seed uses deleteMany + create instead of upsert with fixed IDs

    Fees module uses client-fetch + route handler pattern (inconsistent with rest of app)

    src/lib/rbac.ts helpers are underused — most features inline their authorization logic

    No pagination anywhere — fine up to a few hundred rows per view

11. Conventions quick reference
Rule	Example
Server components fetch data	const data = await prisma.x.findMany(...)
Client components handle UI	'use client' at top
Server actions for mutations	'use server' in actions.ts
Use getPrincipal() for auth	Never trust JWT alone
Fail-closed scope checks	?? '__none__' sentinel
Notifications on state change	tx.notification.create(...)
Audit log sensitive writes	tx.auditLog.create(...)
Stop dev server before Prisma	Windows EPERM prevention
Quote Postgres identifiers	"User", "classId"
Never commit .env	Use .env.example
12. Getting help

If unsure about a pattern, look at the most recent completed feature for a model:

    For role routing + role-specific views: src/app/(app)/attendance/

    For multi-step approvals + notifications: src/app/(app)/leave/

    For scope filtering (college/dept/class): src/app/(app)/notices/

    For file upload/download: src/app/(app)/materials/

    For audit-logged sensitive writes: src/app/api/fees/route.ts

text


---

**Two commits after you paste this in:**

```powershell
git add PROJECT_CONTEXT.md
git commit -m "Update PROJECT_CONTEXT.md: reflect state through fees feature"

Also — create .env.example if you haven't already
powershell

Test-Path .env.example

If False:
powershell

New-Item .env.example

Then paste:
text

DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/easymanage?schema=public"
AUTH_SECRET="generate-with-node-crypto-randomBytes-32-base64"

Commit both together, then push:
powershell

git add .env.example
git commit -m "Add .env.example template for contributors"
git push