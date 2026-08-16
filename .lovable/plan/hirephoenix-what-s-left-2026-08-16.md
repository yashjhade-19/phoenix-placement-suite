# HirePhoenix — what's left

## Current state (verified)

- All screens exist: student side (dashboard, drives, drive detail, applications, profile, announcements, settings) and admin side (dashboard, companies, students, drives list/new/detail, applications, announcements, settings).
- Database has real demo data: 8 companies, 6 drives, 110 students, 60 applications, org invite code `PHOENIX-ADMIN`.
- **There are zero auth accounts.** So there are no login credentials yet — nobody can actually sign in, and the 110 demo students are records only, not linked to logins.

## What remains

1. **Demo login accounts** — create two confirmed accounts so the app can be used immediately:
   - Admin: `admin@northstar.edu` / `Phoenix@2026` (created, then elevated to admin via the existing `claim_admin` code `PHOENIX-ADMIN`).
   - Student: `aarav@northstar.edu` / `Phoenix@2026`, linked to one of the existing demo student rows so their applications, eligibility and profile are already populated.
2. **End-to-end verification in the live preview** — sign in as each role and walk the critical paths: student browses drives, sees eligibility, submits a dynamic-form application, tracks status; admin creates a company/drive, edits eligibility rules and rounds, moves an application through stages, posts an announcement.
3. **Fix whatever the walkthrough surfaces** (query filters, RLS gaps, form validation, empty states).

## Technical notes

- Accounts are created through Auth admin (email confirmed), then a migration links the student account's `user_id` to an existing `students` row and inserts the matching `profiles`/`user_roles` rows, so demo history carries over instead of starting empty.
- No schema changes needed; the `handle_new_user` trigger and `claim_admin` RPC already cover the signup and admin-elevation paths.
